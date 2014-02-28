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
    - stop(userID, reason, sessionID)
    - sendCandidate(userID, candidate, sessionID)
  
  Public callbacks:
    - onCall(fromUserID, sessionDescription, sessionID)
    - onAccept(fromUserID, sessionDescription, sessionID)
    - onReject(fromUserID)
    - onStop(fromUserID, reason)
    - onCandidate(fromUserID, candidate)
 */

var QBSignalingType = {
	CALL: 'qbvideochat_call',
	ACCEPT: 'qbvideochat_acceptCall',
	REJECT: 'qbvideochat_rejectCall',
	STOPCALL: 'qbvideochat_stopCall',
	CANDIDATE: 'qbvideochat_candidate'
};

function QBVideoChatSignaling() {
	var self = this;
	
	this.onCallCallbacks = [];
 	this.onAcceptCallbacks = [];
 	this.onRejectCallbacks = [];
 	this.onStopCallbacks = [];
 	this.onCandidateCallbacks = null;
	
	this.onMessage = function(msg) {
		console.log(msg);
		/*var to = msg.getAttribute('to');
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
					callback(sessionID, body);
				}
			}
			break;
		case QBSignalingType.ACCEPT:
			for (var i=0; i < self.onAcceptCallbacks.length; i++) {
				var callback = self.onAcceptCallbacks[i];
				if (typeof(callback) === "function") {
					callback(body);
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
		case QBSignalingType.STOPCALL:
			for (var i=0; i < self.onStopCallbacks.length; i++) {
				var callback = self.onStopCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID, body, sessionID);
				}
			}
			break;
		case QBSignalingType.CANDIDATE:
			var jsonCandidate = self.xmppTextToDictionary(body);
			self.onCandidateCallbacks(jsonCandidate);
			break;
		}*/
		
		return true;
	};
	
	this.sendMessage = function(userID, type, data, sessionID) {
		var opponentJID, body, reply;
		
		opponentJID = getJID(userID);
		body = data ? data : '';
		
		params = {
			to: opponentJID,
			from: connection.jid, 
			type: type
		};
		
		reply = $msg(params).c('body').t(body);
		connection.send(reply);
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
	traceS('call to ' + userID);
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

QBVideoChatSignaling.prototype.stop = function(userID, reason, sessionID) {
	traceS('stop ' + userID);
	this.sendMessage(userID, QBSignalingType.STOPCALL, reason, sessionID);
};

QBVideoChatSignaling.prototype.sendCandidate = function(userID, candidate, sessionID) {
	this.sendMessage(userID, QBSignalingType.CANDIDATE, candidate, sessionID);
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

QBVideoChatSignaling.prototype.addOnStopCallback = function(callback) {
	this.onStopCallbacks.push(callback);
};

function traceS(text) {
	console.log("[qb_videochat_signalling]: " + text);
}
