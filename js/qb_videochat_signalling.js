/**
 * QuickBlox VideoChat WebRTC signaling library
 * version 0.1.0
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */

/*
  Public methods:
    - call(userID, sessionDescription, sessionID)
    - accept(userID, sessionDescription, sessionID)
    - reject(userID, sessionID)
    - sendCandidate(userID, candidate, sessionID)
    - stop(userID, reason, sessionID)
  
  Public callbacks:
    - onCall(fromUserID, sessionDescription, sessionID)
    - onAccept(fromUserID, sessionDescription, sessionID)
    - onReject(fromUserID)
    - onCandidate(fromUserID, candidate)
    - onStop(fromUserID, reason)
 */

var QBSignalingType = {
	CALL: 'qbvideochat_call',
	ACCEPT: 'qbvideochat_acceptCall',
	REJECT: 'qbvideochat_rejectCall',
	CANDIDATE: 'qbvideochat_candidate',
	STOPCALL: 'qbvideochat_stopCall'
};

function QBVideoChatSignaling() {
	var self = this;
	
	this.onCallCallbacks = [];
 	this.onAcceptCallbacks = [];
 	this.onRejectCallbacks = [];
 	this.onCandidateCallbacks = [];
 	this.onStopCallbacks = [];
	
	this.onMessage = function(msg) {
		var to = msg.getAttribute('to');
		var from = msg.getAttribute('from');
		var type = msg.getAttribute('type');
		var elems = msg.getElementsByTagName('body');
		var body = Strophe.getText(elems[0]);
		var fromUserID = from.split('-')[0];
		var sessionID = '110101010101';
	
		switch (type) {
		case QBSignalingType.CALL:
			for (var i=0; i < self.onCallCallbacks.length; i++) {
				var callback = self.onCallCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID, body, sessionID);
				}
			}
			break;
		case QBSignalingType.ACCEPT:
			for (var i=0; i < self.onAcceptCallbacks.length; i++) {
				var callback = self.onAcceptCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID, body, sessionID);
				}
			}
			break;
		case QBSignalingType.REJECT:
			for (var i=0; i < self.onRejectCallbacks.length; i++) {
				var callback = self.onRejectCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID);
				}
			}
			break;
		case QBSignalingType.CANDIDATE:
			for (var i=0; i < self.onCandidateCallbacks.length; i++) {
				var callback = self.onCandidateCallbacks[i];
				if (typeof(callback) === "function") {
					var jsonCandidate = self.xmppTextToDictionary(body);
					callback(fromUserID, jsonCandidate, sessionID);
				}
			}
			break;
		case QBSignalingType.STOPCALL:
			for (var i=0; i < self.onStopCallbacks.length; i++) {
				var callback = self.onStopCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID, body, sessionID);
				}
			}
			break;
		}

		return true;
	};
	
	this.sendMessage = function(userID, type, data, sessionID) {
		var opponentJID = userID + "-" + QBPARAMS.app_id + "@" + CHAT.server;
		var body = data == null ? '' : data;
	
		var reply = $msg({to: opponentJID, 
						 from: this.userJID, 
						 type: type})
				.cnode(Strophe.xmlElement('body', body));
		
		this.connection.send(reply);
	};

	this.xmppTextToDictionary = function(data) {
		try {
			return $.parseJSON(Strophe.unescapeNode(data));
		} catch(err) {
			return Strophe.unescapeNode(data);
		}
	};

	this.xmppDictionaryToText = function(data) {
		return Strophe.escapeNode(JSON.stringify(data));
	};
}

// methods
QBVideoChatSignaling.prototype.call = function(userID, sessionDescription, sessionID) {
	traceS('call ' + userID);
	this.sendMessage(userID, QBSignalingType.CALL, sessionDescription, sessionID);
};

QBVideoChatSignaling.prototype.accept = function(userID, sessionDescription, sessionID) {
	traceS('accept ' + userID);
	this.sendMessage(userID, QBSignalingType.ACCEPT, sessionDescription, sessionID);
};

QBVideoChatSignaling.prototype.reject = function(userID, sessionID) {
	traceS('reject ' + userID);
	this.sendMessage(userID, QBSignalingType.REJECT, null, sessionID);
};

QBVideoChatSignaling.prototype.sendCandidate = function(userID, candidate, sessionID) {
	this.sendMessage(userID, QBSignalingType.CANDIDATE, candidate, sessionID);
};

QBVideoChatSignaling.prototype.stop = function(userID, reason, sessionID) {
	traceS('stop ' + userID);
	this.sendMessage(userID, QBSignalingType.STOPCALL, reason, sessionID);
};


// callbacks
QBVideoChatSignaling.prototype.addOnCallCallback = function(callback) {
	this.onCallCallbacks.push(callback);
};

QBVideoChatSignaling.prototype.addOnAcceptCallback = function(callback) {
	this.onAcceptCallbacks.push(callback);
};

QBVideoChatSignaling.prototype.addOnRejectCallback = function(callback) {
	this.onRejectCallbacks.push(callback);
};

QBVideoChatSignaling.prototype.addOnCandidateCallback = function(callback) {
	this.onCandidateCallbacks.push(callback);
};

QBVideoChatSignaling.prototype.addOnStopCallback = function(callback) {
	this.onStopCallbacks.push(callback);
};


function traceS(text) {
	console.log("[qb_videochat_signalling]: " + text);
}
