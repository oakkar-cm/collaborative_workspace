const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("../utils/logger");

const whiteboardState = new Map();
const voiceParticipants = new Map();

function initializeSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
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

    socket.on("join_room", ({ room_id }) => {
      socket.join(room_id);
      logger.info(`Socket ${socket.id} joined room ${room_id}`);
    });

    // ── Document collaboration ──────────────────────────────────

    socket.on("document_update", (data) => {
      if (data.workspace_id) {
        socket.to(data.workspace_id).emit("document_update", data);
      }
    });

    socket.on("typing_start", (data) => {
      if (data.workspace_id) {
        socket.to(data.workspace_id).emit("typing_indicator", {
          document_id: data.document_id,
          user_id: data.user_id,
          user_name: data.user_name,
          isTyping: true
        });
      }
    });

    socket.on("typing_stop", (data) => {
      if (data.workspace_id) {
        socket.to(data.workspace_id).emit("typing_indicator", {
          document_id: data.document_id,
          user_id: data.user_id,
          user_name: data.user_name,
          isTyping: false
        });
      }
    });

    // ── Whiteboard ──────────────────────────────────────────────

    socket.on("whiteboard:request", ({ workspace_id }) => {
      const state = whiteboardState.get(workspace_id) || {
        stickyNotes: [],
        shapes: [],
        paths: [],
        texts: []
      };
      socket.emit("whiteboard:init", { workspace_id, ...state });
    });

    socket.on("whiteboard:update", (data) => {
      const { workspace_id, type } = data;
      if (!workspace_id) return;

      let state = whiteboardState.get(workspace_id) || {
        stickyNotes: [],
        shapes: [],
        paths: [],
        texts: []
      };

      if (type === "sticky" && data.stickyNotes) state.stickyNotes = data.stickyNotes;
      if (type === "shape" && data.shapes) state.shapes = data.shapes;
      if (type === "path" && data.paths) state.paths = data.paths;
      if (type === "text" && data.texts) state.texts = data.texts;
      if (type === "delete") {
        if (data.stickyNotes) state.stickyNotes = data.stickyNotes;
        if (data.shapes) state.shapes = data.shapes;
        if (data.paths) state.paths = data.paths;
        if (data.texts) state.texts = data.texts;
      }
      if (type === "clear") {
        state = { stickyNotes: [], shapes: [], paths: [], texts: [] };
      }

      whiteboardState.set(workspace_id, state);
      socket.to(workspace_id).emit("whiteboard:update", data);
    });

    // ── Voice chat signaling ────────────────────────────────────

    socket.on("voice_join", ({ workspaceId, userId, userName }) => {
      if (!workspaceId) return;

      socket.join(workspaceId);
      socket.voiceRoom = workspaceId;
      socket.voiceUserId = userId;
      socket.voiceUserName = userName;

      if (!voiceParticipants.has(workspaceId)) {
        voiceParticipants.set(workspaceId, new Map());
      }
      voiceParticipants.get(workspaceId).set(userId, {
        userId,
        userName,
        socketId: socket.id
      });

      socket.to(workspaceId).emit("voice:user-joined", { userId, userName });

      const participants = Array.from(voiceParticipants.get(workspaceId).values())
        .map((p) => ({ userId: p.userId, userName: p.userName }));
      socket.emit("voice:participants", { participants });
    });

    socket.on("voice_leave", ({ workspaceId, userId }) => {
      if (!workspaceId) return;

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

      socket.voiceRoom = null;
      socket.voiceUserId = null;
      socket.voiceUserName = null;
    });

    socket.on("voice_offer", ({ to, offer, workspaceId, from }) => {
      const room = voiceParticipants.get(workspaceId);
      if (room && room.has(to)) {
        io.to(room.get(to).socketId).emit("voice:offer", { from, offer });
      }
    });

    socket.on("voice_answer", ({ to, answer, workspaceId, from }) => {
      const room = voiceParticipants.get(workspaceId);
      if (room && room.has(to)) {
        io.to(room.get(to).socketId).emit("voice:answer", { from, answer });
      }
    });

    socket.on("voice_ice_candidate", ({ to, candidate, workspaceId, from }) => {
      const room = voiceParticipants.get(workspaceId);
      if (room && room.has(to)) {
        io.to(room.get(to).socketId).emit("voice:ice-candidate", { from, candidate });
      }
    });

    socket.on("voice_mute_status", ({ workspaceId, userId, isMuted }) => {
      if (workspaceId) {
        socket.to(workspaceId).emit("voice:mute-status", { userId, isMuted });
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
