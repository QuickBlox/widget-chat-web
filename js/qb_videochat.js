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
    - accept(userID)
    - reject(userID)
    - stop(userID)
  
  Public callbacks:
    - onCall(fromUserID, sessionDescription)
    - onAccept(fromUserID, sessionDescription)
    - onReject(fromUserID)
    - onStop(fromUserID, reason)
    - onCandidate(fromUserID, candidate)
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

function QBVideoChat(constraints, localStreamElement, remoteStreamElement, signalingService) {
 	var self = this;
	
  this.sessionID = new Date().getTime();
  traceVC("sessionID = " + this.sessionID);
  
	this.candidatesQueue = [];
	this.state = QBVideoChatState.INACTIVE;
	
  this.localStreamElement = localStreamElement;
  this.remoteStreamElement = remoteStreamElement;
  this.constraints = constraints;
  
  this.signalingService = signalingService;
  this.signalingService.onCandidateCallbacks = this.addCandidate;
  this.signalingService.addOnCallCallback(this.onCallSignalingCallback);
	this.signalingService.addOnAcceptCallback(this.onAcceptSignalingCallback);
  
  // Signalling callbacks
	this.onCallSignalingCallback = function(sessionID, sessionDescription) {
		traceVC("onCall");
		self.sessionID = sessionID;
    self.remoteSessionDescription = sessionDescription;
	};
	
	this.onAcceptSignalingCallback = function(sessionDescription) {
		traceVC("onAccept");
		self.setRemoteDescription(sessionDescription, "answer"); //TODO: refactor this (hide)
	};
	
  // MediaStream getUserMedia 
	this.getUserMedia = function() {
		traceVC("getUserMedia...");
		
		getUserMedia(this.constraints, successCallback, errorCallback);
		
		function successCallback(localMediaStream) {
			traceVC("getUserMedia success");
			$('.loading_messages').remove();
			$('#doCall').show();
			
			self.localStream = localMediaStream;
			attachMediaStream(self.localStreamElement, localMediaStream);
			self.createRTCPeerConnection();
		}

		function errorCallback(error) {
			traceVC("getUserMedia error: ", error);
			closeVideoChat();
		}
	};
	
	// RTCPeerConnection creation
	this.createRTCPeerConnection = function() {
		traceVC("RTCPeerConnection...");
		try {
			this.pc = new RTCPeerConnection(ICE_SERVERS);
			this.pc.onicecandidate = this.onIceCandidateCallback;
			this.pc.onaddstream = this.onRemoteStreamAddedCallback;
			this.pc.onremovestream = this.onRemoteStreamRemovedCallback;
		
			this.pc.addStream(this.localStream);
   
			traceVC('RTCPeerConnnection created');
			//console.log(this.pc);
		} catch (e) {
			traceVC('RTCPeerConnection failed: ' + e.message);
		}
	};
	
	// onIceCandidate callback
	this.onIceCandidateCallback = function(event) {
		var candidate = event.candidate;
	
		//traceVC('iceGatheringState: ' + event.target.iceGatheringState);
	
		if (candidate) {
			var iceData = {sdpMLineIndex: candidate.sdpMLineIndex,
      					  		  sdpMid: candidate.sdpMid,
      				   		   candidate: candidate.candidate}
      				   		   
      		//traceVC('onIceCandidateCallback: ' + JSON.stringify(iceData));
			
    		var iceDataAsmessage = self.signalingService.xmppDictionaryToText(iceData);
  	
  			if(self.state == QBVideoChatState.INACTIVE){
  			    // save to queue
  			    //traceVC('candidate queued');
  			    self.candidatesQueue.push(iceDataAsmessage);
  			} else{
  			    // Send ICE candidate to opponent
				self.signalingService.sendCandidate(self.opponentID, iceDataAsmessage, self.sessionID);
			}

		} else {
			//traceVC('No candidates');
		}
	};

	// onRemoteStreamAdded callback
	this.onRemoteStreamAddedCallback = function(event) {
 		traceVC('Remote stream added: ' + event);
 	
 	 	// save remote stream
  	self.remoteStream = event.stream;
  		
  	// play remote stream
 		attachMediaStream(self.remoteStreamElement, event.stream);
	};

	// onRemoteStreamRemoved callback
	this.onRemoteStreamRemovedCallback = function(event) {
  	traceVC('Remote stream removed: ' + event);
	};
	
	// set Remote description
	this.setRemoteDescription = function(descriptionSDP, descriptionType) {
	  this.state = QBVideoChatState.ESTABLISHING;
	  	
		var sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
		//traceVC('setRemoteDescription: ' + descriptionSDP + ', pc:' + this.pc);
	
		this.pc.setRemoteDescription(sessionDescription,
			function onSuccess() {
				traceVC("Added remote description");
				if(sessionDescription.type === 'offer'){
  					traceVC('Creating answer to peer...');
  					self.pc.createAnswer(self.onGetSessionDescriptionSuccessCallback, self.onCreateAnswerFailureCallback, SDP_CONSTRAINTS);
  				}
			},
			function onError(error) {
				traceVC('setRemoteDescription error: ' + error);
			}
		);
		
		// send candidates
		for (var i=0; i<this.candidatesQueue.length; i++) {
			var candidate = this.candidatesQueue.pop();
			self.signalingService.sendCandidate(self.opponentID, candidate, self.sessionID);
		}
	};
	
	this.onGetSessionDescriptionSuccessCallback = function(sessionDescription) {
		//console.log(sessionDescription);
	  
		self.pc.setLocalDescription(sessionDescription,
                                
                                function onSuccess() {
                                  traceVC('setLocalDescription success');
                                  self.localSessionDescription = sessionDescription;
                                  
                                  // ICE gathering starts work here
                                  if (sessionDescription.type === 'offer')
                                    self.sendCallRequest();
                                  else if (sessionDescription.type === 'answer')
                                    self.sendAceptRequest();
                                },
                                
                                function onError(error) {
                                  traceVC('setLocalDescription error: ' + error);
                                });
	};

	this.onCreateOfferFailureCallback = function(event) {
		traceVC('createOffer() error: ', event);
	};
	
	this.onCreateAnswerFailureCallback = function(event) {
		traceVC('createAnswer() error: ', event);
	};
	
	// Add ICE candidates 
	this.addCandidate = function(jsonCandidate) {
		traceVC("Added remote candidate: " + JSON.stringify(jsonCandidate));
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: jsonCandidate.sdpMLineIndex,
				candidate: jsonCandidate.candidate,
				   sdpMid: jsonCandidate.sdpMid
		});
		self.pc.addIceCandidate(candidate);
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
  		traceVC("Closed RTC");
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

// Accept call from user 
QBVideoChat.prototype.accept = function(userID) {
	traceVC("accept");
	
	this.opponentID = userID;
	
	// set remote description here
	this.setRemoteDescription(this.remoteSessionDescription, "offer");
	
	this.state = QBVideoChatState.ESTABLISHING;
};

// Reject call from user  
QBVideoChat.prototype.reject = function(userID) {
	traceVC("reject");
	this.signalingService.reject(userID, this.sessionID);
	
	this.state = QBVideoChatState.INACTIVE;
};

// Stap call with user
QBVideoChat.prototype.stop = function(userID) {
	traceVC("stop");
	this.signalingService.stops(userID, "manual", this.sessionID);
	
	this.state = QBVideoChatState.INACTIVE;
};

function traceVC(text) {
	console.log("[qb_videochat]: " + text);
}