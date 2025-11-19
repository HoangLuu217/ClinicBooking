const WebRTCService = {
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isInitiator: false,
  conversationId: null,
  onCallStateChange: null,
  onRemoteStream: null,
  onCallEnded: null,
  
  // WebRTC configuration
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  },

  // Initialize WebRTC service
  initialize(conversationId, isInitiator = false) {
    this.conversationId = conversationId;
    this.isInitiator = isInitiator;
    this.setupPeerConnection();
  },

  // Setup peer connection
  setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.config);

    // Handle incoming remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream');
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          conversationId: this.conversationId
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.onCallStateChange) {
        this.onCallStateChange(this.peerConnection.connectionState);
      }
    };
  },

  // Start call
  async startCall() {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create offer if initiator
      if (this.isInitiator) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        this.sendSignalingMessage({
          type: 'offer',
          offer: offer,
          conversationId: this.conversationId
        });
      }

      return this.localStream;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  },

  // Answer call
  async answerCall(offer) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        conversationId: this.conversationId
      });
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  },

  // Handle incoming offer
  async handleOffer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        conversationId: this.conversationId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  },

  // Handle incoming answer
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  },

  // Handle ICE candidate
  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  },

  // Send signaling message via WebSocket
  sendSignalingMessage(message) {
    // This will be connected to the existing WebSocket in DoctorMessages
    if (window.webrtcSignalingCallback) {
      window.webrtcSignalingCallback(message);
    }
  },

  // Toggle camera
  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  },

  // Toggle microphone
  toggleMicrophone() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  },

  // End call
  endCall() {
    try {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Send call ended signal
      this.sendSignalingMessage({
        type: 'call-ended',
        conversationId: this.conversationId
      });

      // Notify call ended
      if (this.onCallEnded) {
        this.onCallEnded();
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  },

  // Cleanup
  cleanup() {
    this.endCall();
    this.conversationId = null;
    this.isInitiator = false;
    this.onCallStateChange = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
  },

  // Create a new instance
  create() {
    return Object.create(this);
  }
};

export default WebRTCService;