/**
 * QuickBlox VideoChat WebRTC library
 * version 0.1.0
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

/*
  Public methods:
    - call(userID, userAvatar)
    - accept(userID)
    - reject(userID)
    - stop(userID)
 */

var SDP_CONSTRAINTS = {
	'mandatory': {
		'OfferToReceiveAudio': true,
		'OfferToReceiveVideo': true
	}
};

var QBVideoChatState = {
	INACTIVE: 'inactive',
	ESTABLISHING: 'establishing'
};

function QBVideoChat(constraints, signalingService, sessionID, sessionDescription) {
 	var self = this;
	
	this.candidatesQueue = [];
	this.state = QBVideoChatState.INACTIVE;
	
	this.onGetUserMediaSuccess = null;
	this.onGetUserMediaError = null;
	this.localStreamElement = null;
	this.remoteStreamElement = null;
	
	this.constraints = constraints;
	this.sessionID = sessionID || new Date().getTime();
	this.remoteSessionDescription = sessionDescription;
	traceVC("sessionID " + this.sessionID);
	
	// Signalling callbacks
	this.onAcceptSignalingCallback = function(sessionDescription) {
		self.setRemoteDescription(sessionDescription, "answer");
	};
	
	this.addCandidate = function(data) {
		var jsonCandidate, candidate;
		
		jsonCandidate = self.signalingService.xmppTextToDictionary(data);
		candidate = new RTCIceCandidate(jsonCandidate);
		
		self.pc.addIceCandidate(candidate);
	};
	
	this.signalingService = signalingService;
	this.signalingService.onInnerAcceptCallback = this.onAcceptSignalingCallback;
	this.signalingService.onCandidateCallback = this.addCandidate;
	
	// MediaStream getUserMedia
	this.getUserMedia = function() {
		traceVC("getUserMedia...");
		
		getUserMedia(self.constraints, successCallback, errorCallback);
		
		function successCallback(localMediaStream) {
			traceVC("getUserMedia success");
			self.localStream = localMediaStream;
			self.onGetUserMediaSuccess();
			self.createRTCPeerConnection();
		}
		
		function errorCallback(error) {
			traceVC("getUserMedia error: " + JSON.stringify(error));
			self.onGetUserMediaError();
		}
	};
	
	// MediaStream attachMedia
	this.attachMediaStream = function(elem) {
		elem.volume = 0.7;
		attachMediaStream(elem, self.localStream);
	}
	
	// MediaStream reattachMedia
	this.reattachMediaStream = function(to, from) {
		to.volume = 0.7;
		reattachMediaStream(to, from);
	}
	
	// RTCPeerConnection creation
	this.createRTCPeerConnection = function() {
		traceVC("RTCPeerConnection...");
		try {
			this.pc = new RTCPeerConnection(ICE_SERVERS);
			this.pc.addStream(this.localStream);
			this.pc.onicecandidate = this.onIceCandidateCallback;
			this.pc.onaddstream = this.onRemoteStreamAddedCallback;
			traceVC('RTCPeerConnnection created');
		} catch (e) {
			traceVC('RTCPeerConnection failed: ' + e.message);
		}
	};
	
	// onIceCandidate callback
	this.onIceCandidateCallback = function(event) {
		var iceData, iceDataAsmessage, candidate = event.candidate;
		
		if (candidate) {
			iceData = {
				sdpMLineIndex: candidate.sdpMLineIndex,
				candidate: candidate.candidate,
				sdpMid: candidate.sdpMid
			};
			
			iceDataAsmessage = self.signalingService.xmppDictionaryToText(iceData);
			
			if (self.state == QBVideoChatState.INACTIVE)
				self.candidatesQueue.push(iceDataAsmessage);
			else {
				// Send ICE candidate to opponent
				self.signalingService.sendCandidate(self.opponentID, iceDataAsmessage, self.sessionID);
			}
		}
	};

	// onRemoteStreamAdded callback
	this.onRemoteStreamAddedCallback = function(event) {
		traceVC('Remote stream added');
		attachMediaStream(self.remoteStreamElement, event.stream);
		self.remoteStream = event.stream;
	};

	// onRemoteStreamRemoved callback
	this.onRemoteStreamRemovedCallback = function(event) {
		traceVC('Remote stream removed');
	};
	
	// Set LocalDescription
	this.onGetSessionDescriptionSuccessCallback = function(sessionDescription) {
		traceVC('LocalDescription...');
		
		self.pc.setLocalDescription(sessionDescription,
                                
                                function onSuccess() {
                                  traceVC('LocalDescription success');
                                  self.localSessionDescription = sessionDescription;
                                  
                                  // ICE gathering starts work here
                                  if (sessionDescription.type === 'offer')
                                    self.sendCallRequest();
                                  else if (sessionDescription.type === 'answer')
                                    self.sendAceptRequest();
                                },
                                
                                function onError(error) {
                                  traceVC('LocalDescription error: ' + JSON.stringify(error));
                                }
		);
	};

	this.onCreateOfferFailureCallback = function(error) {
		traceVC('createOffer() error: ' + JSON.stringify(error));
	};
	
	// Set RemoteDescription
	this.setRemoteDescription = function(descriptionSDP, descriptionType) {
		traceVC('RemoteDescription...');
		var sessionDescription, candidate;
		
		this.state = QBVideoChatState.ESTABLISHING;
		sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
		
		this.pc.setRemoteDescription(sessionDescription,
                                 
                                 function onSuccess() {
                                   traceVC("RemoteDescription success");
                                   
                                   if (sessionDescription.type === 'offer')
                                     self.pc.createAnswer(self.onGetSessionDescriptionSuccessCallback, self.onCreateAnswerFailureCallback, SDP_CONSTRAINTS);
                                 },
                                 
                                 function onError(error) {
                                   traceVC('RemoteDescription error: ' + JSON.stringify(error));
                                 }
		);
		
		// send candidates
		for (var i = 0; i < this.candidatesQueue.length; i++) {
			candidate = this.candidatesQueue.pop();
			self.signalingService.sendCandidate(self.opponentID, candidate, self.sessionID);
		}
	};
	
	this.onCreateAnswerFailureCallback = function(error) {
		traceVC('createAnswer() error: ' + JSON.stringify(error));
	};
	
	this.sendCallRequest = function() {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		self.signalingService.call(self.opponentID, self.localSessionDescription.sdp, self.sessionID, self.opponentAvatar);
	};
	
	this.sendAceptRequest = function() {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		self.signalingService.accept(self.opponentID, self.localSessionDescription.sdp, self.sessionID);
	};

	// Cleanup 
	this.hangup = function() {
		self.state = QBVideoChatState.INACTIVE;
		self.signalingService = null;
		self.localStream.stop();
		self.pc.close();
		self.pc = null;
	};
}

// Call to user
QBVideoChat.prototype.call = function(userID, userAvatar) {
	if (this.localSessionDescription) {
		this.sendCallRequest();
	} else {
		this.opponentID = userID;
		this.opponentAvatar = userAvatar;
		this.pc.createOffer(this.onGetSessionDescriptionSuccessCallback, this.onCreateOfferFailureCallback);
	}
};

// Accept call from user 
QBVideoChat.prototype.accept = function(userID) {
	this.opponentID = userID;
	this.setRemoteDescription(this.remoteSessionDescription, "offer");
};

// Reject call from user
QBVideoChat.prototype.reject = function(userID) {
	this.signalingService.reject(userID, this.sessionID);
};

// Stop call with user
QBVideoChat.prototype.stop = function(userID) {
	this.signalingService.stop(userID, "manual", this.sessionID);
	this.hangup();
};

function traceVC(text) {
	console.log("[qb_videochat]: " + text);
}