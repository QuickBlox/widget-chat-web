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
	
	this.onCallCallback = null;
 	this.onAcceptCallbacks = [];
 	this.onRejectCallbacks = [];
 	this.onStopCallbacks = [];
 	this.onCandidateCallback = null;
	
	this.onMessage = function(msg) {
		var author, type, body;
		var qbID, sessionID, callback;
		
		author = $(msg).attr('from');
		type = $(msg).attr('type');
		body = $(msg).find('body')[0].textContent;
		sessionID = $(msg).find('session')[0].textContent;
		
		qbID = getIDFromNode(author);
		
		switch (type) {
		case QBSignalingType.CALL:
			self.onCallCallback(qbID, body, sessionID);
			break;
		case QBSignalingType.ACCEPT:
			for (var i = 0; i < self.onAcceptCallbacks.length; i++) {
				callback = self.onAcceptCallbacks[i];
				if (typeof(callback) === "function")
					callback(qbID, body);
			}
			break;
		case QBSignalingType.REJECT:
			for (var i = 0; i < self.onRejectCallbacks.length; i++) {
				callback = self.onRejectCallbacks[i];
				if (typeof(callback) === "function")
					callback(qbID);
			}
			break;
		case QBSignalingType.STOPCALL:
			for (var i = 0; i < self.onStopCallbacks.length; i++) {
				callback = self.onStopCallbacks[i];
				if (typeof(callback) === "function")
					callback(qbID, body, sessionID);
			}
			break;
		case QBSignalingType.CANDIDATE:
			self.onCandidateCallback(body);
			break;
		}
		
		return true;
	};
	
	this.sendMessage = function(userID, type, data, sessionID) {
		var opponentJID, reply;
		
		opponentJID = getJID(userID);
		
		params = {
			to: opponentJID,
			from: connection.jid, 
			type: type
		};
		
		reply = $msg(params).c('body').t(data).up().c('session').t(sessionID);
		connection.send(reply);
	};
	
	this.xmppTextToDictionary = function(data) {
		return $.parseJSON(Strophe.unescapeNode(data));
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
