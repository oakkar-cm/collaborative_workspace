import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Users } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import client from '../api/client';

const DEFAULT_ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

const VoiceChat = ({ socket, workspaceId, currentUser }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteAudiosRef = useRef({});
  const audioMonitorsRef = useRef({});
  const iceConfigRef = useRef(DEFAULT_ICE_CONFIG);
  const isInCallRef = useRef(false);
  const endingCallRef = useRef(false);

  const currentUserId = String(currentUser?.user_id || currentUser?.userId || '');

  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  const shouldInitiateOffer = useCallback((peerId) => {
    const self = String(currentUserId || '');
    const peer = String(peerId || '');
    if (!self || !peer) return false;
    return self < peer;
  }, [currentUserId]);

  const cleanupAudioMonitor = useCallback((userId) => {
    const monitor = audioMonitorsRef.current[userId];
    if (!monitor) return;
    if (monitor.rafId) cancelAnimationFrame(monitor.rafId);
    try {
      monitor.source?.disconnect();
    } catch (_) {
      // no-op
    }
    if (monitor.audioContext && monitor.audioContext.state !== 'closed') {
      monitor.audioContext.close().catch(() => {});
    }
    delete audioMonitorsRef.current[userId];
    setSpeakingUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const closePeerConnection = useCallback((userId) => {
    const normalizedUserId = String(userId);
    const pc = peerConnectionsRef.current[normalizedUserId];
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
      delete peerConnectionsRef.current[normalizedUserId];
    }

    const remoteAudio = remoteAudiosRef.current[normalizedUserId];
    if (remoteAudio) {
      remoteAudio.srcObject = null;
      remoteAudio.remove();
      delete remoteAudiosRef.current[normalizedUserId];
    }

    cleanupAudioMonitor(normalizedUserId);
  }, [cleanupAudioMonitor]);

  const monitorAudioLevel = useCallback((stream, userId) => {
    const normalizedUserId = String(userId);
    cleanupAudioMonitor(normalizedUserId);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const monitor = { audioContext, analyser, source, rafId: null };
    audioMonitorsRef.current[normalizedUserId] = monitor;

    const tick = () => {
      const currentMonitor = audioMonitorsRef.current[normalizedUserId];
      if (!currentMonitor || !peerConnectionsRef.current[normalizedUserId]) return;
      currentMonitor.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setSpeakingUsers((prev) => {
        const next = new Set(prev);
        if (average > 30) next.add(normalizedUserId);
        else next.delete(normalizedUserId);
        return next;
      });
      currentMonitor.rafId = requestAnimationFrame(tick);
    };

    monitor.rafId = requestAnimationFrame(tick);
  }, [cleanupAudioMonitor]);

  const createPeerConnection = useCallback(async (userId) => {
    const normalizedUserId = String(userId);
    if (!normalizedUserId || peerConnectionsRef.current[normalizedUserId]) return;

    const pc = new RTCPeerConnection(iceConfigRef.current || DEFAULT_ICE_CONFIG);
    peerConnectionsRef.current[normalizedUserId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      let remoteAudio = remoteAudiosRef.current[normalizedUserId];
      if (!remoteAudio) {
        remoteAudio = document.createElement('audio');
        remoteAudio.autoplay = true;
        remoteAudio.playsInline = true;
        document.body.appendChild(remoteAudio);
        remoteAudiosRef.current[normalizedUserId] = remoteAudio;
      }
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.volume = isSpeakerMuted ? 0 : 1;
      remoteAudio.play().catch(() => {
        toast.error('Click once to enable audio playback');
      });
      monitorAudioLevel(event.streams[0], normalizedUserId);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && socket?.connected) {
        socket.emit('voice_ice_candidate', {
          to: normalizedUserId,
          candidate: event.candidate,
          workspaceId
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        closePeerConnection(normalizedUserId);
      }
    };
  }, [closePeerConnection, isSpeakerMuted, monitorAudioLevel, socket, workspaceId]);

  const createOffer = useCallback(async (userId) => {
    const normalizedUserId = String(userId);
    const pc = peerConnectionsRef.current[normalizedUserId];
    if (!pc || !socket?.connected) return;
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      socket.emit('voice_offer', {
        to: normalizedUserId,
        offer,
        workspaceId
      });
    } catch (_) {
      toast.error('Failed to create call offer');
    }
  }, [socket, workspaceId]);

  const endCall = useCallback((options = {}) => {
    const { silent = false, emitLeave = true } = options;
    if (endingCallRef.current) return;
    if (!isInCallRef.current && !localStreamRef.current) return;
    endingCallRef.current = true;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    Object.keys(peerConnectionsRef.current).forEach((userId) => {
      closePeerConnection(userId);
    });

    Object.keys(audioMonitorsRef.current).forEach((userId) => {
      cleanupAudioMonitor(userId);
    });

    if (emitLeave && socket?.connected) {
      socket.emit('voice_leave', { workspaceId });
    }

    setIsInCall(false);
    isInCallRef.current = false;
    setIsMuted(false);
    setActiveParticipants([]);
    setSpeakingUsers(new Set());
    if (!silent) toast.info('Left voice chat');

    endingCallRef.current = false;
  }, [cleanupAudioMonitor, closePeerConnection, socket, workspaceId]);

  useEffect(() => {
    if (!socket) return undefined;

    const onUserJoined = async ({ userId, userName }) => {
      const normalizedUserId = String(userId);
      if (!normalizedUserId || normalizedUserId === currentUserId) return;
      setActiveParticipants((prev) => {
        if (prev.some((p) => String(p.userId) === normalizedUserId)) return prev;
        toast.success(`${userName || 'User'} joined the call`);
        return [...prev, { userId: normalizedUserId, userName: userName || 'User' }];
      });
      if (isInCallRef.current && localStreamRef.current && shouldInitiateOffer(normalizedUserId)) {
        await createPeerConnection(normalizedUserId);
        await createOffer(normalizedUserId);
      }
    };

    const onUserLeft = ({ userId, userName }) => {
      const normalizedUserId = String(userId);
      if (!normalizedUserId) return;
      setActiveParticipants((prev) => prev.filter((p) => String(p.userId) !== normalizedUserId));
      closePeerConnection(normalizedUserId);
      toast.info(`${userName || 'User'} left the call`);
    };

    const onOffer = async ({ from, offer }) => {
      const normalizedFrom = String(from);
      if (!normalizedFrom || normalizedFrom === currentUserId) return;
      await createPeerConnection(normalizedFrom);
      const pc = peerConnectionsRef.current[normalizedFrom];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice_answer', { to: normalizedFrom, answer, workspaceId });
      } catch (_) {
        toast.error('Failed to answer call');
      }
    };

    const onAnswer = async ({ from, answer }) => {
      const normalizedFrom = String(from);
      const pc = peerConnectionsRef.current[normalizedFrom];
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (_) {
        toast.error('Failed to sync call answer');
      }
    };

    const onIceCandidate = async ({ from, candidate }) => {
      const normalizedFrom = String(from);
      const pc = peerConnectionsRef.current[normalizedFrom];
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {
        // ignore transient ICE errors
      }
    };

    const onParticipants = ({ participants }) => {
      const others = (participants || [])
        .map((participant) => ({
          userId: String(participant.userId),
          userName: participant.userName || 'User'
        }))
        .filter((participant) => participant.userId !== currentUserId);
      setActiveParticipants(others);
      if (isInCallRef.current && localStreamRef.current) {
        others.forEach(async (participant) => {
          if (!peerConnectionsRef.current[participant.userId] && shouldInitiateOffer(participant.userId)) {
            await createPeerConnection(participant.userId);
            await createOffer(participant.userId);
          }
        });
      }
    };

    socket.on('voice:user-joined', onUserJoined);
    socket.on('voice:user-left', onUserLeft);
    socket.on('voice:offer', onOffer);
    socket.on('voice:answer', onAnswer);
    socket.on('voice:ice-candidate', onIceCandidate);
    socket.on('voice:participants', onParticipants);

    return () => {
      socket.off('voice:user-joined', onUserJoined);
      socket.off('voice:user-left', onUserLeft);
      socket.off('voice:offer', onOffer);
      socket.off('voice:answer', onAnswer);
      socket.off('voice:ice-candidate', onIceCandidate);
      socket.off('voice:participants', onParticipants);
    };
  }, [socket, currentUserId, createOffer, createPeerConnection, shouldInitiateOffer, closePeerConnection, workspaceId]);

  useEffect(() => () => {
    endCall({ silent: true, emitLeave: true });
  }, [endCall]);

  const startCall = async () => {
    if (!socket || !socket.connected) {
      toast.error('Not connected to server. Please refresh.');
      return;
    }
    if (isInCallRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });

      localStreamRef.current = stream;
      setIsInCall(true);
      isInCallRef.current = true;

      try {
        const response = await client.get('/rtc/ice-config');
        if (response?.data?.iceServers?.length) {
          iceConfigRef.current = { ...DEFAULT_ICE_CONFIG, ...response.data };
        }
      } catch (_) {
        iceConfigRef.current = DEFAULT_ICE_CONFIG;
      }

      socket.emit('voice_join', { workspaceId });
      toast.success('Joined voice chat');
    } catch (error) {
      if (error.name === 'NotAllowedError') toast.error('Microphone permission denied');
      else if (error.name === 'NotFoundError') toast.error('No microphone detected');
      else toast.error(error?.message || 'Failed to start voice chat');
    }
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const muted = !track.enabled;
    setIsMuted(muted);
    if (socket?.connected) {
      socket.emit('voice_mute_status', { workspaceId, isMuted: muted });
    }
  };

  const toggleSpeaker = () => {
    const nextMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextMuted);
    Object.values(remoteAudiosRef.current).forEach((audio) => {
      audio.volume = nextMuted ? 0 : 1;
    });
  };

  return (
    <div className="glass-panel mx-4 mb-4 rounded-2xl border border-blue-100 p-4">
      {/* Voice Chat Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isInCall ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'
          }`} />
          <span className="text-sm font-medium text-[#0F172A]">
            Voice Chat {isInCall && `(${activeParticipants.length + 1})`}
          </span>
          {isInCall && (
            <span className="rounded-full bg-[#DBEAFE] px-2 py-1 text-xs text-[#1D4ED8]">
              Global Ready
            </span>
          )}
        </div>
        {activeParticipants.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-[#64748B]">
            <Users className="w-3 h-3" />
            {activeParticipants.length} in call
          </div>
        )}
      </div>

      {/* Active Participants */}
      {isInCall && activeParticipants.length > 0 && (
        <div className="mb-4 max-h-24 overflow-y-auto">
          <div className="space-y-2">
            {activeParticipants.map(participant => (
              <div
                key={participant.userId}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  speakingUsers.has(participant.userId)
                    ? 'bg-[#10B981]/10 border border-[#10B981]'
                    : 'bg-[#F8F9FA]'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  speakingUsers.has(participant.userId) ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
                }`} />
                <span className="text-sm text-[#0F172A]">{participant.userName}</span>
                {speakingUsers.has(participant.userId) && (
                  <Volume2 className="w-3 h-3 text-[#10B981] ml-auto" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">{!isInCall ? (
          <Button
            onClick={startCall}
            data-testid="start-voice-call"
            className="flex-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white transition-all active:scale-95 hover:brightness-105"
          >
            <Phone className="w-4 h-4 mr-2" />
            Join Voice Chat
          </Button>
        ) : (
          <>
            <Button
              onClick={toggleMute}
              data-testid="toggle-mute"
              variant={isMuted ? 'destructive' : 'outline'}
              className="flex-1 rounded-full transition-all active:scale-95"
            >
              {isMuted ? (
                <><MicOff className="w-4 h-4 mr-2" /> Muted</>
              ) : (
                <><Mic className="w-4 h-4 mr-2" /> Unmute</>
              )}
            </Button>
            
            <Button
              onClick={toggleSpeaker}
              data-testid="toggle-speaker"
              variant={isSpeakerMuted ? 'destructive' : 'outline'}
              className="rounded-full transition-all active:scale-95"
            >
              {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            <Button
              onClick={() => endCall({ silent: false, emitLeave: true })}
              data-testid="end-voice-call"
              variant="destructive"
              className="rounded-full transition-all active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default VoiceChat;
