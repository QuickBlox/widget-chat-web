/**
 * QuickBlox VideoChat WebRTC library
 * version 0.1.0
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

/*
  Public methods:
    - call(userID)
    - stop(userID)
    - accept(userID)
    - reject(userID)
 */

var SDP_CONSTRAINTS = {
	'mandatory': {
		'OfferToReceiveAudio': true,
		'OfferToReceiveVideo': true
	}
};

var QBVideoChatState = {
	INACTIVE: 'inactive',
	ESTABLISHING: 'establishing',
	ACTIVE: 'active'
};

function QBVideoChat(constraints, localStreamElement, remoteStreamElement, signalingService, sessionID) {
 	var self = this;
	
	this.candidatesQueue = [];
	this.remoteSessionDescription = null;
	this.onGetUserMediaSuccess = null;
	this.onGetUserMediaError = null;
	this.state = QBVideoChatState.INACTIVE;
	
	this.constraints = constraints;
	this.localStreamElement = localStreamElement;
	this.remoteStreamElement = remoteStreamElement;
	
	this.sessionID = sessionID || new Date().getTime();
	traceVC("sessionID " + this.sessionID);
	
	// Signalling callbacks
	this.addCandidate = function(data) {
		var jsonCandidate, candidate;
		
		jsonCandidate = self.signalingService.xmppTextToDictionary(data);
		candidate = new RTCIceCandidate(jsonCandidate);
		
		self.pc.addIceCandidate(candidate);
	};
	
	this.onAcceptSignalingCallback = function(userID, sessionDescription) {
		self.setRemoteDescription(sessionDescription, "answer"); //TODO: refactor this (hide)
	};
	
	this.signalingService = signalingService;
	this.signalingService.onCandidateCallback = this.addCandidate;
	this.signalingService.addOnAcceptCallback(this.onAcceptSignalingCallback);
	
	// MediaStream getUserMedia 
	this.getUserMedia = function() {
		traceVC("getUserMedia...");
		
		getUserMedia(this.constraints, successCallback, errorCallback);
		
		function successCallback(localMediaStream) {
			traceVC("getUserMedia success");
			attachMediaStream(self.localStreamElement, localMediaStream);
			self.localStream = localMediaStream;
			self.createRTCPeerConnection();
			self.onGetUserMediaSuccess();
		}

		function errorCallback(error) {
			traceVC("getUserMedia error: ", error);
			self.onGetUserMediaSuccess();
		}
	};
	
	// RTCPeerConnection creation
	this.createRTCPeerConnection = function() {
		traceVC("RTCPeerConnection...");
		try {
			this.pc = new RTCPeerConnection(ICE_SERVERS);
			console.log(this.pc);
			this.pc.addStream(this.localStream);
			this.pc.onicecandidate = this.onIceCandidateCallback;
			this.pc.onaddstream = this.onRemoteStreamAddedCallback;
			this.pc.onremovestream = this.onRemoteStreamRemovedCallback;
			
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
                                  traceVC('LocalDescription error: ' + error);
                                }
		);
	};

	this.onCreateOfferFailureCallback = function(event) {
		traceVC('createOffer() error: ', event);
	};
	
	// Set RemoteDescription
	this.setRemoteDescription = function(descriptionSDP, descriptionType) {
		traceVC('RemoteDescription...');
		var sessionDescription, candidate;
		
		this.state = QBVideoChatState.ESTABLISHING;
		sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
		console.log(descriptionType);
		console.log(sessionDescription);
		console.log(this.pc);
		
		this.pc.setRemoteDescription(sessionDescription,
                                 
                                 function onSuccess() {
                                   traceVC("RemoteDescription success");
                                   
                                   if (sessionDescription.type === 'offer')
                                     self.pc.createAnswer(self.onGetSessionDescriptionSuccessCallback, self.onCreateAnswerFailureCallback, SDP_CONSTRAINTS);
                                 },
                                 
                                 function onError(error) {
                                   traceVC('RemoteDescription error: ' + error);
                                 }
		);
		
		// send candidates
		for (var i = 0; i < this.candidatesQueue.length; i++) {
			candidate = this.candidatesQueue.pop();
			self.signalingService.sendCandidate(self.opponentID, candidate, self.sessionID);
		}
	};
	
	this.onCreateAnswerFailureCallback = function(event) {
		traceVC('createAnswer() error: ', event);
	};
	
	this.sendCallRequest = function() {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		self.signalingService.call(self.opponentID, self.localSessionDescription.sdp, self.sessionID);
	};
	
	this.sendAceptRequest = function() {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		self.signalingService.accept(self.opponentID, self.localSessionDescription.sdp, self.sessionID);
	};

	// Cleanup 
	this.hangup = function() {
		this.signalingService.onAcceptCallbacks[1] = null;
		self.localStream.stop();
		//self.pc.removeStream(self.localStream);
		self.pc.close();
		self.pc = null;
	};
}

// Call to user
QBVideoChat.prototype.call = function(userID) {
	if (this.localSessionDescription) return;
	
	this.opponentID = userID;
	this.pc.createOffer(this.onGetSessionDescriptionSuccessCallback, this.onCreateOfferFailureCallback);
};

// Stop call with user
QBVideoChat.prototype.stop = function(userID) {
	this.signalingService.stop(userID, "manual", this.sessionID);
	this.state = QBVideoChatState.INACTIVE;
	this.hangup();
};

// Accept call from user 
QBVideoChat.prototype.accept = function(userID) {
	this.opponentID = userID;
	this.setRemoteDescription(this.remoteSessionDescription, "offer");
};

// Reject call from user
QBVideoChat.prototype.reject = function(userID) {
	this.signalingService.reject(userID, this.sessionID);
	this.state = QBVideoChatState.INACTIVE;
};

function traceVC(text) {
	console.log("[qb_videochat]: " + text);
}