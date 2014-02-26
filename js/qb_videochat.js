/*
 * QuickBlox VideoChat WebRTC library
 * version 0.02
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

// STUN/TURN servers
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}, 
								{'url': 'turn:turnserver.quickblox.com:3478?transport=udp', 
								 'username': 'user',
								 'credential': 'user'},
								{'url': 'turn:turnserver.quickblox.com:3478?transport=tcp', 
								  'username': 'user',
								  'credential': 'user'}]};

// SDP constraints 
var sdpConstraints = {'mandatory': {
	'OfferToReceiveAudio':true,
	'OfferToReceiveVideo':true }
};

// Video chat state
var VIDEOCHAT_STATE = {
                        INACTIVE      : 'INACTIVE',
                        ESTABLISHING  : 'ESTABLISHING',
                        ACTIVE        : 'ACTIVE'
};

/*
  Public methods:
  	- call(userID)
  	- accept(userID)
  	- reject(userID)
    - stop(userID)

  Public callbacks:
   	- onConnectionSuccess(user_id)
	- onConnectionFailed(error)
	- onConnectionDisconnected()
	- onCall(fromUserID, sessionDescription)
	- onAccept(fromUserID, sessionDescription)
	- onReject(fromUserID)
	- onCandidate(fromUserID, candidate)
	- onStop(fromUserID, reason)
 */

function QBVideoChat(localStreamElement, remoteStreamElement, constraints, signalingService){
 	traceVC("QBVideoChat INIT");
 	
 	this.state = VIDEOCHAT_STATE.INACTIVE;
 	
    // save local & remote <video> elements
    this.localStreamElement = localStreamElement;
    this.remoteStreamElement = remoteStreamElement;
    this.remoteStreamElement.loadedmetadata = function(e) {
  		traceVC("VideoChat loadedmetadata");
	};
	this.remoteStreamElement.oncanplay = function(e) {
  		traceVC("VideoChat oncanplay");
	};
	this.remoteStreamElement.onplaying = function(e) {
  		traceVC("VideoChat onplaying");
	};
	
	// candidates queue
	this.candidatesQueue = new Array();
	
    // Media constraints. Video & Audio always can be configured later
    this.constraints = constraints;
    
    // VideoChat session ID
    this.sessionID = new Date().getTime()/1000;
    traceVC("sessionID: " + this.sessionID);
        
    var self = this;
    
    // Signalling callbacks
	this.onCallSignalingCallback = function (fromUserID, sessionDescription, sessionID){
		traceVC("onCall");
		
		self.sessionID = sessionID;
    	self.remoteSessionDescription = sessionDescription;
	};
	this.onAcceptSignalingCallback = function (fromUserID, sessionDescription, sessionID){
		traceVC("onAccept");
		
		self.setRemoteDescription(sessionDescription, "answer"); //TODO: refactor this (hide)
	};
	this.onCandidateSignalingCallback = function (fromUserID, candidate, sessionID){
		//traceVC("onCandidate: " + JSON.stringify(candidate));
	
    	self.addCandidate(candidate);
	};
    
    // Set signaling service
    this.signalingService = signalingService;
    this.signalingService.addOnCallCallback(this.onCallSignalingCallback);
	this.signalingService.addOnAcceptCallback(this.onAcceptSignalingCallback);
	this.signalingService.addOnCandidateCallback(this.onCandidateSignalingCallback);
	    
    
    // MediaStream getUserMedia 
	this.getUserMedia = function () {
		traceVC("getUserMedia...");
		
		function successCallback(localMediaStream) {
			traceVC("getUserMedia successCallback");
	
			// save local stream
			self.localStream = localMediaStream;

			// play own stream
			attachMediaStream(self.localStreamElement, localMediaStream);
			
			//
			// Create RTC peer connection
			self.createRTCPeerConnection();
		}

		function errorCallback(error){
		   traceVC("getUserMedia errorCallback: ", error);
		}

		// Get User media
		getUserMedia(this.constraints, successCallback, errorCallback);
	}
	//
	// Call getUserMedia
	this.getUserMedia();
	
	// RTCPeerConnection creation
	this.createRTCPeerConnection = function () {
		traceVC("createRTCPeerConnection...");
		try {
			this.pc = new RTCPeerConnection(pc_config);
			this.pc.onicecandidate = this.onIceCandidateCallback;
			this.pc.onaddstream = this.onRemoteStreamAddedCallback;
			this.pc.onremovestream = this.onRemoteStreamRemovedCallback;
		
			this.pc.addStream(this.localStream);
   
			traceVC('Created RTCPeerConnnection');
		} catch (e) {
			traceVC('Failed to create RTCPeerConnection, exception: ' + e.message);
			alert('Cannot create RTCPeerConnection object.');
		}
	}
	
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
  	
  			if(self.state == VIDEOCHAT_STATE.INACTIVE){
  			    // save to queue
  			    //traceVC('candidate queued');
  			    self.candidatesQueue.push(iceDataAsmessage);
  			}else{
  			    // Send ICE candidate to opponent
				self.signalingService.sendCandidate(self.opponentID, iceDataAsmessage, self.sessionID);
			}

		} else {
			//traceVC('No candidates');
		}
	}

	// onRemoteStreamAdded callback
	this.onRemoteStreamAddedCallback = function(event) {
 		traceVC('Remote stream added: ' + event);
 	
 	 	// save remote stream
  		self.remoteStream = event.stream;
  		
  		// play remote stream
 		attachMediaStream(self.remoteStreamElement, event.stream);
	}

	// onRemoteStreamRemoved callback
	this.onRemoteStreamRemovedCallback = function(event) {
  		 traceVC('Remote stream removed: ' + event);
	}
	
	// set Remote description
	this.setRemoteDescription = function (descriptionSDP, descriptionType){
	  	this.state = VIDEOCHAT_STATE.ESTABLISHING;
	  	
		var sessionDescription = new RTCSessionDescription({sdp: descriptionSDP, type: descriptionType});
		//traceVC('setRemoteDescription: ' + descriptionSDP + ', pc:' + this.pc);
	
		this.pc.setRemoteDescription(sessionDescription,
			function onSuccess(){
				traceVC("Added remote description");
				if(sessionDescription.type === 'offer'){
  					traceVC('Creating answer to peer...');
  					self.pc.createAnswer(self.onGetSessionDescriptionSuccessCallback, self.onCreateAnswerFailureCallback, sdpConstraints);
  				}
			},function onError(error){
				traceVC('setRemoteDescription error: ' + error);
			}
		);
		
		// send candidates
		for (var i=0; i<this.candidatesQueue.length; i++) {
			var candidate = this.candidatesQueue.pop();
			self.signalingService.sendCandidate(self.opponentID, candidate, self.sessionID);
		}
	}
	
	this.onGetSessionDescriptionSuccessCallback = function(sessionDescription) {
		traceVC('sessionDescriptionSuccessCallback: ' + sessionDescription);
	    
		self.pc.setLocalDescription(sessionDescription, 
			function onSuccess(){
				traceVC('setLocalDescription onSuccess');
				
				self.localSessionDescription = sessionDescription;
				
				// ICE gathering starts work here
				//

				if (sessionDescription.type === 'offer') {
					self.sendCallRequest();
				}else if (sessionDescription.type === 'answer') {
					self.sendAceptRequest();
				}
				
			},function onError(error){
				traceVC('setLocalDescription error: ' + error);
			}
		);
	}

	this.onCreateOfferFailureCallback = function(event){
		traceVC('createOffer() error: ', event);
	}

	this.onCreateAnswerFailureCallback = function(event){
		traceVC('createAnswer() error: ', event);
	}
	
	// Add ICE candidates 
	this.addCandidate = function (jsonCandidate){
		traceVC("Added remote candidate: " + JSON.stringify(jsonCandidate));
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: jsonCandidate.sdpMLineIndex,
				candidate: jsonCandidate.candidate,
				   sdpMid: jsonCandidate.sdpMid
		});
		self.pc.addIceCandidate(candidate);
	}
	
	
	this.sendCallRequest = function () {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		self.signalingService.call(self.opponentID, self.localSessionDescription.sdp, self.sessionID);
	}
	
	this.sendAceptRequest = function () {
		// Send only string representation of sdp
		// http://www.w3.org/TR/webrtc/#rtcsessiondescription-class
	
		self.signalingService.accept(self.opponentID, self.localSessionDescription.sdp, self.sessionID);
	}

	// Cleanup 
	this.hangup = function () {
  		traceVC("Closed RTC");
  		self.pc.close();
  		self.pc = null;
	}
}
    
// Call to user  
QBVideoChat.prototype.call = function(userID) {
	traceVC("Call");
	
	if(this.localSessionDescription != null){
		return;
	}
	
	this.opponentID = userID;
	
	traceVC('Creating offer to peer...' + this.pc);
  	this.pc.createOffer(this.onGetSessionDescriptionSuccessCallback, this.onCreateOfferFailureCallback);
}

// Accept call from user 
QBVideoChat.prototype.accept = function(userID) {
	traceVC("Accept");
	
	this.opponentID = userID;
	
	// set remote description here
	this.setRemoteDescription(this.remoteSessionDescription, "offer");
	
	this.state = VIDEOCHAT_STATE.ESTABLISHING;
}

// Reject call from user  
QBVideoChat.prototype.reject = function(userID) {
	this.signalingService.reject(userID, this.sessionID);
	
	this.state = VIDEOCHAT_STATE.INACTIVE;
}

// Stap call with user
QBVideoChat.prototype.stop = function(userID) {
	this.signalingService.stops(userID, "manual", this.sessionID);
	
	this.state = VIDEOCHAT_STATE.INACTIVE;
}

// Logger
function traceVC(text) {
	console.log("[qb_videochat]: " + text);
}