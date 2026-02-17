import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX, Users } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const VoiceChat = ({ socket, workspaceId, currentUser, members }) => {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const remoteAudiosRef = useRef({});

  const iceServers = {
    iceServers: [
      // STUN servers for NAT traversal
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // FREE TURN servers for relay (global connectivity)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      // Backup TURN server
      {
        urls: 'turn:relay.metered.ca:80',
        username: 'e46a6190c9c8f90d506da0a8',
        credential: 'QE3WBZPFVH7FKz9W'
      },
      {
        urls: 'turn:relay.metered.ca:443',
        username: 'e46a6190c9c8f90d506da0a8',
        credential: 'QE3WBZPFVH7FKz9W'
      }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all' // Use TURN even if STUN works
  };

  useEffect(() => {
    if (!socket) return;

    // Voice chat signaling events
    socket.on('voice:user-joined', handleUserJoined);
    socket.on('voice:user-left', handleUserLeft);
    socket.on('voice:offer', handleOffer);
    socket.on('voice:answer', handleAnswer);
    socket.on('voice:ice-candidate', handleIceCandidate);
    socket.on('voice:participants', handleParticipantsUpdate);

    return () => {
      socket.off('voice:user-joined', handleUserJoined);
      socket.off('voice:user-left', handleUserLeft);
      socket.off('voice:offer', handleOffer);
      socket.off('voice:answer', handleAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
      socket.off('voice:participants', handleParticipantsUpdate);
      
      // Cleanup on unmount
      if (isInCall) {
        endCall();
      }
    };
  }, [socket, currentUser, isInCall]);

  const handleUserJoined = async ({ userId, userName }) => {
    if (userId === currentUser.user_id) return;
    
    console.log('🔵 New user joined voice chat:', userName, userId);
    toast.success(`${userName} joined the call`);
    setActiveParticipants(prev => [...prev, { userId, userName }]);

    // Create offer for new user IMMEDIATELY
    if (isInCall && localStreamRef.current) {
      console.log('📞 Creating peer connection and offer for new user:', userId);
      await createPeerConnection(userId);
      await createOffer(userId);
    }
  };

  const handleUserLeft = ({ userId, userName }) => {
    toast.info(`${userName} left the call`);
    setActiveParticipants(prev => prev.filter(p => p.userId !== userId));
    closePeerConnection(userId);
  };

  const handleOffer = async ({ from, offer }) => {
    console.log('Received offer from:', from);
    await createPeerConnection(from);
    const pc = peerConnectionsRef.current[from];
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote description set for:', from);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Created and set local answer for:', from);

      socket.emit('voice_answer', {
        to: from,
        answer,
        workspaceId,
        from: currentUser.user_id
      });
      console.log('Answer sent to:', from);
    } catch (err) {
      console.error('Error handling offer:', err);
      toast.error('Failed to establish voice connection');
    }
  };

  const handleAnswer = async ({ from, answer }) => {
    console.log('Received answer from:', from);
    const pc = peerConnectionsRef.current[from];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Remote description set from answer for:', from);
      } catch (err) {
        console.error('Error setting remote description from answer:', err);
      }
    } else {
      console.warn('No peer connection found for answer from:', from);
    }
  };

  const handleIceCandidate = async ({ from, candidate }) => {
    console.log('Received ICE candidate from:', from);
    const pc = peerConnectionsRef.current[from];
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added successfully for:', from);
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    } else {
      console.warn('No peer connection found for ICE candidate from:', from);
    }
  };

  const handleParticipantsUpdate = ({ participants }) => {
    console.log('📋 Received participants list:', participants);
    const others = participants.filter(p => p.userId !== currentUser.user_id);
    setActiveParticipants(others);
    
    // Connect to all existing participants
    if (isInCall && localStreamRef.current) {
      console.log('🔗 Connecting to existing participants:', others.length);
      others.forEach(async (participant) => {
        if (!peerConnectionsRef.current[participant.userId]) {
          console.log('📞 Creating connection to existing user:', participant.userName);
          await createPeerConnection(participant.userId);
          await createOffer(participant.userId);
        }
      });
    }
  };

  const createPeerConnection = async (userId) => {
    if (peerConnectionsRef.current[userId]) return;

    console.log('Creating peer connection for user:', userId);
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[userId] = pc;

    // Add local audio track
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
        console.log('Added local track to peer connection');
      });
    }

    // Handle incoming audio
    pc.ontrack = (event) => {
      console.log('Received remote track from user:', userId);
      
      // Create or get existing audio element
      let remoteAudio = remoteAudiosRef.current[userId];
      if (!remoteAudio) {
        remoteAudio = document.createElement('audio');
        remoteAudio.autoplay = true;
        remoteAudio.playsInline = true;
        document.body.appendChild(remoteAudio);
        remoteAudiosRef.current[userId] = remoteAudio;
      }
      
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.volume = isSpeakerMuted ? 0 : 1.0;
      
      // Play audio (some browsers require user interaction)
      remoteAudio.play().catch(err => {
        console.error('Error playing audio:', err);
        toast.error('Click to enable audio playback');
      });
      
      // Monitor audio levels for speaking indicator
      monitorAudioLevel(event.streams[0], userId);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to user:', userId);
        socket.emit('voice_ice_candidate', {
          to: userId,
          candidate: event.candidate,
          workspaceId,
          from: currentUser.user_id
        });
      } else {
        console.log('All ICE candidates sent for user:', userId);
      }
    };

    pc.onicecandidateerror = (event) => {
      console.error('ICE candidate error:', event);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${userId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        console.log('✅ ICE connection established with:', userId);
        
        // Check if using TURN relay
        pc.getStats().then(stats => {
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              const localCandidate = stats.get(report.localCandidateId);
              const remoteCandidate = stats.get(report.remoteCandidateId);
              
              if (localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay') {
                console.log('🔄 Using TURN relay for:', userId);
                toast.info('Connected via relay server (TURN)');
              } else {
                console.log('🔗 Direct P2P connection for:', userId);
                toast.success('Direct connection established');
              }
            }
          });
        });
      }
      if (pc.iceConnectionState === 'failed') {
        console.error('❌ ICE connection failed with:', userId);
        toast.error(`Voice connection failed with ${userId}`);
      }
      if (pc.iceConnectionState === 'disconnected') {
        console.warn('⚠️ ICE connection disconnected with:', userId);
        // Try to reconnect
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            pc.restartIce();
            console.log('Attempting ICE restart for:', userId);
          }
        }, 2000);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        toast.success('Voice connection established');
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        closePeerConnection(userId);
      }
    };
  };

  const createOffer = async (userId) => {
    console.log('Creating offer for user:', userId);
    const pc = peerConnectionsRef.current[userId];
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);
      console.log('Local description set, sending offer to:', userId);

      socket.emit('voice_offer', {
        to: userId,
        offer,
        workspaceId,
        from: currentUser.user_id
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const closePeerConnection = (userId) => {
    const pc = peerConnectionsRef.current[userId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[userId];
    }
    
    // Clean up remote audio element
    const remoteAudio = remoteAudiosRef.current[userId];
    if (remoteAudio) {
      remoteAudio.srcObject = null;
      remoteAudio.remove();
      delete remoteAudiosRef.current[userId];
    }
  };

  const monitorAudioLevel = (stream, userId) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 512;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      if (average > 30) {
        setSpeakingUsers(prev => new Set([...prev, userId]));
      } else {
        setSpeakingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
      
      if (peerConnectionsRef.current[userId]) {
        requestAnimationFrame(checkAudioLevel);
      }
    };
    
    checkAudioLevel();
  };

  const startCall = async () => {
    try {
      console.log('🎙️ Starting voice call...');
      console.log('Socket connected:', socket?.connected);
      console.log('Current user:', currentUser?.name, currentUser?.user_id);
      
      if (!socket || !socket.connected) {
        toast.error('Not connected to server. Please refresh the page.');
        return;
      }

      // Request microphone access with high-quality constraints
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

      console.log('✅ Microphone access granted');
      localStreamRef.current = stream;
      setIsInCall(true);

      // Notify others
      console.log('📡 Emitting voice_join to workspace:', workspaceId);
      socket.emit('voice_join', {
        workspaceId,
        userId: currentUser.user_id,
        userName: currentUser.name
      });

      toast.success('Joined voice chat - waiting for others...');
    } catch (error) {
      console.error('Failed to start call:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found. Please check your device.');
      } else {
        toast.error('Failed to access microphone: ' + error.message);
      }
    }
  };

  const endCall = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    Object.keys(peerConnectionsRef.current).forEach(userId => {
      closePeerConnection(userId);
    });

    socket.emit('voice_leave', {
      workspaceId,
      userId: currentUser.user_id
    });

    setIsInCall(false);
    setActiveParticipants([]);
    setSpeakingUsers(new Set());
    toast.info('Left voice chat');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      
      socket.emit('voice_mute_status', {
        workspaceId,
        userId: currentUser.user_id,
        isMuted: !audioTrack.enabled
      });
    }
  };

  const toggleSpeaker = () => {
    const newMutedState = !isSpeakerMuted;
    setIsSpeakerMuted(newMutedState);
    
    // Update all remote audio elements
    Object.values(remoteAudiosRef.current).forEach(audio => {
      audio.volume = newMutedState ? 0 : 1.0;
    });
  };

  return (
    <div className="border-t border-[#E2E8F0] p-4 bg-white">
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
            <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-1 rounded-full">
              🌐 Global Ready
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

      {/* Connection Status Debug (only in dev) */}
      {process.env.NODE_ENV === 'development' && isInCall && (
        <div className="mb-3 text-xs text-[#64748B] bg-[#F8F9FA] p-2 rounded border border-[#E2E8F0]">
          <div className="font-semibold mb-1">Debug Info:</div>
          <div>Socket Connected: {socket?.connected ? '✅' : '❌'}</div>
          <div>Local Stream: {localStreamRef.current ? '✅' : '❌'}</div>
          <div>Peer Connections: {Object.keys(peerConnectionsRef.current).length}</div>
          <div>Audio Elements: {Object.keys(remoteAudiosRef.current).length}</div>
          <div>Active Participants: {activeParticipants.length}</div>
          <button
            onClick={() => {
              console.log('=== VOICE CHAT DEBUG ===');
              console.log('Socket:', socket);
              console.log('Local Stream:', localStreamRef.current);
              console.log('Peer Connections:', peerConnectionsRef.current);
              console.log('Remote Audios:', remoteAudiosRef.current);
              console.log('Active Participants:', activeParticipants);
              Object.entries(peerConnectionsRef.current).forEach(([userId, pc]) => {
                console.log(`Peer ${userId}:`, {
                  connectionState: pc.connectionState,
                  iceConnectionState: pc.iceConnectionState,
                  signalingState: pc.signalingState
                });
              });
            }}
            className="mt-2 text-xs bg-[#6366F1] text-white px-2 py-1 rounded"
          >
            Log Full Debug Info
          </button>
        </div>
      )}

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
        {!isInCall && (
          <div className="text-xs text-[#64748B] bg-[#F8F9FA] p-3 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-start gap-2">
              <span className="text-base">🌐</span>
              <div>
                <strong className="text-[#0F172A]">Global Voice Chat</strong>
                <p className="mt-1">Works across different WiFi networks and countries. Using STUN + TURN servers for worldwide connectivity.</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">{!isInCall ? (
          <Button
            onClick={startCall}
            data-testid="start-voice-call"
            className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white rounded-full transition-all active:scale-95"
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
              onClick={endCall}
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
