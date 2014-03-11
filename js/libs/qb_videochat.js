/**
 * QuickBlox VideoChat WebRTC library
 * version 0.2.0
 *
 * Authors: Igor Khomenko (igor@quickblox.com), Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

/*
  Public methods:
    - call(userID, userAvatar)
    - accept(userID)
    - reject(userID)
    - stop(userID)
 */

var PC_CONSTRAINTS = {
	'optional': []
};

var SDP_CONSTRAINTS = {
	'optional': [],
	'mandatory': {
		'OfferToReceiveAudio': true,
		'OfferToReceiveVideo': true
	}
};

var QBVideoChatState = {
	INACTIVE: 'inactive',
	ESTABLISHING: 'establishing'
};

function QBVideoChat(constraints, iceServers, signalingService, sessionID, sessionDescription) {
 	var _this = this;
	
	this.state = QBVideoChatState.INACTIVE;
	this.candidatesQueue = [];
	
	this.onGetUserMediaSuccess = null;
	this.onGetUserMediaError = null;
	this.localStreamElement = null;
	this.remoteStreamElement = null;
	
	this.constraints = constraints;
	this.iceServers = iceServers;
	this.sessionID = parseInt(sessionID || new Date().getTime());
	this.remoteSessionDescription = sessionDescription;
	traceVC("sessionID " + this.sessionID);
	
	// Signalling callbacks
	this.onAcceptSignalingCallback = function(sessionDescription) {
		this.setRemoteDescription(sessionDescription, "answer");
	};
	
	this.addCandidate = function(data) {
		var jsonCandidate, candidate;
		
		jsonCandidate = this.signalingService.xmppTextToDictionary(data);
		candidate = new RTCIceCandidate(jsonCandidate);
		
		this.pc.addIceCandidate(candidate);
	};
	
	this.signalingService = signalingService;
	this.signalingService.onInnerAcceptCallback = this.onAcceptSignalingCallback;
	this.signalingService.onCandidateCallback = this.addCandidate;
	
	// MediaStream getUserMedia
	this.getUserMedia = function() {
		traceVC("getUserMedia...");
		
		getUserMedia(this.constraints, successCallback, errorCallback);
		
		function successCallback(localMediaStream) {
			traceVC("getUserMedia success");
			_this.localStream = localMediaStream;
			_this.onGetUserMediaSuccess();
			_this.createRTCPeerConnection();
		}
		
		function errorCallback(error) {
			traceVC("getUserMedia error: " + JSON.stringify(error));
			_this.onGetUserMediaError();
		}
	};
	
	// MediaStream attachMedia
	this.attachMediaStream = function(elem, stream) {
		elem.volume = 0.7;
		attachMediaStream(elem, stream);
	}
	
	// MediaStream reattachMedia
	this.reattachMediaStream = function(to, from) {
		to.volume = 0.7;
		reattachMediaStream(to, from);
	}
	
	// RTCPeerConnection creation
	this.createRTCPeerConnection = function() {
		traceVC("RTCPeerConnection...");
		var pcConfig = {
			'iceServers': createIceServers(this.iceServers.urls, this.iceServers.username, this.iceServers.password)
		};
		try {
			this.pc = new RTCPeerConnection(pcConfig, PC_CONSTRAINTS);
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
			
			iceDataAsmessage = this.signalingService.xmppDictionaryToText(iceData);
			
			if (this.state == QBVideoChatState.INACTIVE)
				this.candidatesQueue.push(iceDataAsmessage);
			else {
				// Send ICE candidate to opponent
				this.signalingService.sendCandidate(this.opponentID, iceDataAsmessage, this.sessionID);
			}
		}
	};

	// onRemoteStreamAdded callback
	this.onRemoteStreamAddedCallback = function(event) {
		traceVC('Remote stream added');
		this.remoteStream = event.stream;
		this.attachMediaStream(this.remoteStreamElement, event.stream);
	};
	
	// Set LocalDescription
	this.onGetSessionDescriptionSuccessCallback = function(sessionDescription) {
		traceVC('LocalDescription...');
		
		this.pc.setLocalDescription(sessionDescription,
                                
                                function onSuccess() {
                                  traceVC('LocalDescription success');
                                  _this.localSessionDescription = sessionDescription;
                                  
                                  // ICE gathering starts work here
                                  if (sessionDescription.type === 'offer')
                                    _this.sendCallRequest();
                                  else if (sessionDescription.type === 'answer')
                                    _this.sendAceptRequest();
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
                                     _this.pc.createAnswer(_this.onGetSessionDescriptionSuccessCallback, _this.onCreateAnswerFailureCallback, SDP_CONSTRAINTS);
                                 },
                                 
                                 function onError(error) {
                                   traceVC('RemoteDescription error: ' + JSON.stringify(error));
                                 }
		);
		
		// send candidates
		for (var i = 0; i < this.candidatesQueue.length; i++) {
			candidate = this.candidatesQueue.pop();
			this.signalingService.sendCandidate(this.opponentID, candidate, this.sessionID);
		}
	};
	
	this.onCreateAnswerFailureCallback = function(error) {
		traceVC('createAnswer() error: ' + JSON.stringify(error));
	};
	
	this.sendCallRequest = function() {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		this.signalingService.call(this.opponentID, this.localSessionDescription.sdp, this.sessionID, this.opponentAvatar);
	};
	
	this.sendAceptRequest = function() {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		this.signalingService.accept(this.opponentID, this.localSessionDescription.sdp, this.sessionID);
	};

	// Cleanup 
	this.hangup = function() {
		this.state = QBVideoChatState.INACTIVE;
		this.signalingService = null;
		this.localStream.stop();
		this.pc.close();
		this.pc = null;
	};
}

// Call to user
QBVideoChat.prototype.call = function(userID, userAvatar) {
	if (this.localSessionDescription) {
		this.sendCallRequest();
	} else {
		this.opponentID = userID;
		this.opponentAvatar = userAvatar;
		this.pc.createOffer(this.onGetSessionDescriptionSuccessCallback, this.onCreateOfferFailureCallback, SDP_CONSTRAINTS);
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
};

function traceVC(text) {
	console.log("[qb_videochat]: " + text);
}