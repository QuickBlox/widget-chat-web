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
    - onAccept(fromUserID)
    - onInnerAccept(sessionDescription)
    - onReject(fromUserID)
    - onStop(fromUserID, reason)
    - onCandidate(candidate)
 */

var QBSignalingType = {
	CALL: 'qbvideochat_call',
	ACCEPT: 'qbvideochat_acceptCall',
	REJECT: 'qbvideochat_rejectCall',
	STOP: 'qbvideochat_stopCall',
	CANDIDATE: 'qbvideochat_candidate'
};

function QBVideoChatSignaling(appID, chatServer, connection) {
	var self = this;
	
	this.onCallCallback = null;
 	this.onAcceptCallback = null;
 	this.onInnerAcceptCallback = null;
 	this.onRejectCallback = null;
	this.onStopCallback = null;
 	this.onCandidateCallback = null;
 	
 	this.appID = appID;
 	this.chatServer = chatServer;
 	this.connection = connection;
	
	this.onMessage = function(msg) {
		console.log(msg);
		var author, type, body;
		var qbID, sessionID, callback;
		
		author = $(msg).attr('from');
		type = $(msg).attr('type');
		body = $(msg).find('body')[0].textContent;
		sessionID = $(msg).find('session')[0].textContent;
		
		qbID = self.getIDFromNode(author);
		console.log(type);
		console.log(qbID);
		
		switch (type) {
		case QBSignalingType.CALL:
			self.onCallCallback(qbID, body, sessionID);
			break;
		case QBSignalingType.ACCEPT:
			self.onAcceptCallback(qbID);
			self.onInnerAcceptCallback(body);
			break;
		case QBSignalingType.REJECT:
			self.onRejectCallback(qbID);
			break;
		case QBSignalingType.STOP:
			self.onStopCallback(qbID, body);
			break;
		case QBSignalingType.CANDIDATE:
			self.onCandidateCallback(body);
			break;
		}
		
		return true;
	};
	
	this.sendMessage = function(userID, type, data, sessionID) {
		var reply, opponentJID = self.getJID(userID);
		
		params = {
			to: opponentJID,
			from: self.connection.jid, 
			type: type
		};
		
		reply = $msg(params).c('body').t(data).up().c('session').t(sessionID);
		this.connection.send(reply);
	};
	
	this.getJID = function(id) {
		return id + "-" + this.appID + "@" + this.chatServer;
	};
	
	this.getIDFromNode = function(jid) {
		return Strophe.getNodeFromJid(jid).split('-')[0];
	};
	
	this.xmppTextToDictionary = function(data) {
		return $.parseJSON(Strophe.unescapeNode(data));
	};
	
	this.xmppDictionaryToText = function(data) {
		return Strophe.escapeNode(JSON.stringify(data));
	};
}

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
	this.sendMessage(userID, QBSignalingType.STOP, reason, sessionID);
};

QBVideoChatSignaling.prototype.sendCandidate = function(userID, candidate, sessionID) {
	this.sendMessage(userID, QBSignalingType.CANDIDATE, candidate, sessionID);
};

function traceS(text) {
	console.log("[qb_videochat_signalling]: " + text);
}
