const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("../utils/logger");
const Workspace = require("../models/Workspace");
const { MAX_DOCUMENT_CONTENT_LENGTH } = require("../utils/document-content");

const whiteboardState = new Map();
const voiceParticipants = new Map();
const DOC_UPDATE_MIN_INTERVAL_MS = 120;
const TYPING_EVENT_MIN_INTERVAL_MS = 700;
const WHITEBOARD_UPDATE_MIN_INTERVAL_MS = 80;
const ROOM_AUTH_CACHE_TTL_MS = 30_000;
const WHITEBOARD_MAX_ITEMS = 2000;
const WHITEBOARD_MAX_PAYLOAD_CHARS = 2_000_000;

function initializeSocket(io) {
  io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const cookieHeader = socket.handshake.headers?.cookie || "";
    const cookieTokenPair = cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${config.authCookieName}=`));
    const cookieToken = cookieTokenPair ? decodeURIComponent(cookieTokenPair.split("=")[1]) : null;
    const token = authToken || cookieToken;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = { userId: decoded.userId, email: decoded.email };
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    logger.info("User connected:", socket.id, socket.user?.email);
    const documentUpdateTracker = new Map();
    const typingUpdateTracker = new Map();
    const whiteboardUpdateTracker = new Map();

    const authorizedRooms = new Map();

    const socketUserId = String(socket.user?.userId || socket.id);
    const socketUserName = (socket.user?.email || "User").trim();

    const isSocketInWorkspaceRoom = (workspaceId) => Boolean(workspaceId && socket.rooms.has(String(workspaceId)));

    const hasRoomAccess = async (workspaceId, options = {}) => {
      const { forceRevalidate = false } = options;
      try {
        const normalizedWorkspaceId = String(workspaceId || "");
        if (!normalizedWorkspaceId) return false;
        const cachedUntil = authorizedRooms.get(normalizedWorkspaceId);
        if (!forceRevalidate && cachedUntil && cachedUntil > Date.now()) return true;
        const isMember = await Workspace.exists({
          _id: normalizedWorkspaceId,
          members: socket.user?.userId
        });
        if (isMember) {
          authorizedRooms.set(normalizedWorkspaceId, Date.now() + ROOM_AUTH_CACHE_TTL_MS);
          return true;
        }
        authorizedRooms.delete(normalizedWorkspaceId);
      } catch (err) {
        logger.error("Socket room access check failed", err);
      }
      return false;
    };

    const canProcess = (tracker, key, minIntervalMs) => {
      const now = Date.now();
      const last = tracker.get(key) || 0;
      if (now - last < minIntervalMs) return false;
      tracker.set(key, now);
      return true;
    };

    socket.on("join_room", async ({ room_id }) => {
      if (!room_id) return;
      if (!(await hasRoomAccess(room_id))) return;
      socket.join(room_id);
      logger.info(`Socket ${socket.id} joined room ${room_id}`);
    });

    // ── Document collaboration ──────────────────────────────────

    socket.on("document_update", async (data) => {
      if (!data?.workspace_id || !data?.document_id || typeof data.content !== "string") return;
      if (data.content.length > MAX_DOCUMENT_CONTENT_LENGTH) return;
      if (!(await hasRoomAccess(data.workspace_id, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(data.workspace_id)) return;

      const throttleKey = `${data.workspace_id}:${data.document_id}`;
      if (!canProcess(documentUpdateTracker, throttleKey, DOC_UPDATE_MIN_INTERVAL_MS)) return;

      socket.to(data.workspace_id).emit("document_update", {
        workspace_id: data.workspace_id,
        document_id: data.document_id,
        content: data.content,
        user_id: socketUserId
      });
    });

    socket.on("typing_start", async (data) => {
      if (!data?.workspace_id || !data?.document_id) return;
      if (!(await hasRoomAccess(data.workspace_id, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(data.workspace_id)) return;
      const typingKey = `start:${data.workspace_id}:${data.document_id}:${socketUserId}`;
      if (!canProcess(typingUpdateTracker, typingKey, TYPING_EVENT_MIN_INTERVAL_MS)) return;

      socket.to(data.workspace_id).emit("typing_indicator", {
        document_id: data.document_id,
        user_id: socketUserId,
        user_name: socketUserName,
        isTyping: true
      });
    });

    socket.on("typing_stop", async (data) => {
      if (!data?.workspace_id || !data?.document_id) return;
      if (!(await hasRoomAccess(data.workspace_id, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(data.workspace_id)) return;
      const typingKey = `stop:${data.workspace_id}:${data.document_id}:${socketUserId}`;
      if (!canProcess(typingUpdateTracker, typingKey, TYPING_EVENT_MIN_INTERVAL_MS)) return;

      socket.to(data.workspace_id).emit("typing_indicator", {
        document_id: data.document_id,
        user_id: socketUserId,
        user_name: socketUserName,
        isTyping: false
      });
    });

    // ── Whiteboard ──────────────────────────────────────────────

    socket.on("whiteboard:request", async ({ workspace_id }) => {
      if (!(await hasRoomAccess(workspace_id))) return;
      const state = whiteboardState.get(workspace_id) || {
        stickyNotes: [],
        shapes: [],
        paths: [],
        texts: [],
        images: []
      };
      socket.emit("whiteboard:init", { workspace_id, ...state });
    });

    socket.on("whiteboard:update", async (data) => {
      const { workspace_id, type } = data;
      if (!workspace_id) return;
      if (!(await hasRoomAccess(workspace_id, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(workspace_id)) return;
      if (JSON.stringify(data).length > WHITEBOARD_MAX_PAYLOAD_CHARS) return;
      const whiteboardKey = `${workspace_id}:${type || "unknown"}`;
      if (!canProcess(whiteboardUpdateTracker, whiteboardKey, WHITEBOARD_UPDATE_MIN_INTERVAL_MS)) return;

      let state = whiteboardState.get(workspace_id) || {
        stickyNotes: [],
        shapes: [],
        paths: [],
        texts: [],
        images: []
      };

      if (type === "sticky" && Array.isArray(data.stickyNotes) && data.stickyNotes.length <= WHITEBOARD_MAX_ITEMS) state.stickyNotes = data.stickyNotes;
      if (type === "shape" && Array.isArray(data.shapes) && data.shapes.length <= WHITEBOARD_MAX_ITEMS) state.shapes = data.shapes;
      if (type === "path" && Array.isArray(data.paths) && data.paths.length <= WHITEBOARD_MAX_ITEMS) state.paths = data.paths;
      if (type === "text" && Array.isArray(data.texts) && data.texts.length <= WHITEBOARD_MAX_ITEMS) state.texts = data.texts;
      if (type === "image" && Array.isArray(data.images) && data.images.length <= WHITEBOARD_MAX_ITEMS) state.images = data.images;
      if (type === "delete") {
        if (data.stickyNotes) state.stickyNotes = data.stickyNotes;
        if (data.shapes) state.shapes = data.shapes;
        if (data.paths) state.paths = data.paths;
        if (data.texts) state.texts = data.texts;
        if (data.images) state.images = data.images;
      }
      if (type === "clear") {
        state = { stickyNotes: [], shapes: [], paths: [], texts: [], images: [] };
      }

      whiteboardState.set(workspace_id, state);
      socket.to(workspace_id).emit("whiteboard:update", {
        ...data,
        user_id: socketUserId
      });
    });

    // ── Voice chat signaling ────────────────────────────────────

    socket.on("voice_join", async ({ workspaceId }) => {
      if (!workspaceId) return;
      if (!(await hasRoomAccess(workspaceId, { forceRevalidate: true }))) return;

      const resolvedUserId = socketUserId;
      const resolvedUserName = socketUserName;

      socket.join(workspaceId);
      socket.voiceRoom = workspaceId;
      socket.voiceUserId = resolvedUserId;
      socket.voiceUserName = resolvedUserName;

      if (!voiceParticipants.has(workspaceId)) {
        voiceParticipants.set(workspaceId, new Map());
      }
      voiceParticipants.get(workspaceId).set(resolvedUserId, {
        userId: resolvedUserId,
        userName: resolvedUserName,
        socketId: socket.id
      });

      socket.to(workspaceId).emit("voice:user-joined", {
        userId: resolvedUserId,
        userName: resolvedUserName
      });

      const participants = Array.from(voiceParticipants.get(workspaceId).values())
        .map((p) => ({ userId: p.userId, userName: p.userName }));
      socket.emit("voice:participants", { participants });
    });

    socket.on("voice_leave", async ({ workspaceId }) => {
      const resolvedWorkspaceId = workspaceId || socket.voiceRoom;
      const resolvedUserId = String(socket.voiceUserId || socketUserId);
      if (!resolvedWorkspaceId) return;
      if (!(await hasRoomAccess(resolvedWorkspaceId, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(resolvedWorkspaceId)) return;

      if (voiceParticipants.has(resolvedWorkspaceId)) {
        voiceParticipants.get(resolvedWorkspaceId).delete(resolvedUserId);
        if (voiceParticipants.get(resolvedWorkspaceId).size === 0) {
          voiceParticipants.delete(resolvedWorkspaceId);
        }
      }

      socket.to(resolvedWorkspaceId).emit("voice:user-left", {
        userId: resolvedUserId,
        userName: socket.voiceUserName || "Unknown"
      });

      socket.leave(resolvedWorkspaceId);
      socket.voiceRoom = null;
      socket.voiceUserId = null;
      socket.voiceUserName = null;
    });

    socket.on("voice_offer", async ({ to, offer, workspaceId }) => {
      if (!(await hasRoomAccess(workspaceId, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(workspaceId)) return;
      const room = voiceParticipants.get(workspaceId);
      const toKey = String(to);
      if (room && room.has(toKey)) {
        io.to(room.get(toKey).socketId).emit("voice:offer", { from: socketUserId, offer });
      }
    });

    socket.on("voice_answer", async ({ to, answer, workspaceId }) => {
      if (!(await hasRoomAccess(workspaceId, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(workspaceId)) return;
      const room = voiceParticipants.get(workspaceId);
      const toKey = String(to);
      if (room && room.has(toKey)) {
        io.to(room.get(toKey).socketId).emit("voice:answer", { from: socketUserId, answer });
      }
    });

    socket.on("voice_ice_candidate", async ({ to, candidate, workspaceId }) => {
      if (!(await hasRoomAccess(workspaceId, { forceRevalidate: true }))) return;
      if (!isSocketInWorkspaceRoom(workspaceId)) return;
      const room = voiceParticipants.get(workspaceId);
      const toKey = String(to);
      if (room && room.has(toKey)) {
        io.to(room.get(toKey).socketId).emit("voice:ice-candidate", { from: socketUserId, candidate });
      }
    });

    socket.on("voice_mute_status", async ({ workspaceId, isMuted }) => {
      if (workspaceId && (await hasRoomAccess(workspaceId, { forceRevalidate: true })) && isSocketInWorkspaceRoom(workspaceId)) {
        socket.to(workspaceId).emit("voice:mute-status", { userId: socketUserId, isMuted });
      }
    });

    // ── Cleanup ─────────────────────────────────────────────────

    socket.on("disconnect", () => {
      logger.info("User disconnected:", socket.id);

      if (socket.voiceRoom && socket.voiceUserId) {
        const workspaceId = socket.voiceRoom;
        const userId = socket.voiceUserId;

        if (voiceParticipants.has(workspaceId)) {
          voiceParticipants.get(workspaceId).delete(userId);
          if (voiceParticipants.get(workspaceId).size === 0) {
            voiceParticipants.delete(workspaceId);
          }
        }

        socket.to(workspaceId).emit("voice:user-left", {
          userId,
          userName: socket.voiceUserName || "Unknown"
        });
      }
    });
  });
}

module.exports = { initializeSocket };
