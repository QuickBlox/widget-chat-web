/**
 * QuickBlox VideoChat WebRTC signaling library
 * version 0.2.0
 *
 * Authors: Igor Khomenko (igor@quickblox.com), Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

/*
  Public methods:
    - call(userID, sessionDescription, sessionID, userAvatar)
    - accept(userID, sessionDescription, sessionID)
    - reject(userID, sessionID)
    - stop(userID, reason, sessionID)
    - sendCandidate(userID, candidate, sessionID)
  
  Public callbacks:
    - onCall(fromUserID, sessionDescription, sessionID, fromUserAvatar)
    - onAccept(fromUserID)
    - onReject(fromUserID)
    - onStop(fromUserID, reason)
    - onInnerAccept(sessionDescription)
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
	var _this = this;
	
	this.onCallCallback = null;
 	this.onAcceptCallback = null;
 	this.onRejectCallback = null;
	this.onStopCallback = null;
	
	this.onInnerAcceptCallback = null;
 	this.onCandidateCallback = null;
 	
 	this.appID = appID;
 	this.chatServer = chatServer;
 	this.connection = connection;
 	
	this.onMessage = function(msg) {
		var author, type, body;
		var qbID, sessionID, avatar;
		
		author = $(msg).attr('from');
		type = $(msg).attr('type');
		body = $(msg).find('body')[0].textContent;
		sessionID = $(msg).find('session')[0].textContent;
		avatar = $(msg).find('avatar')[0] && $(msg).find('avatar')[0].textContent;
		
		qbID = _this.getIDFromNode(author);
		
		switch (type) {
		case QBSignalingType.CALL:
			traceS('onCall from ' + qbID);
			_this.onCallCallback(qbID, body, sessionID, avatar);
			break;
		case QBSignalingType.ACCEPT:
			traceS('onAccept from ' + qbID);
			_this.onAcceptCallback(qbID);
			_this.onInnerAcceptCallback(body);
			break;
		case QBSignalingType.REJECT:
			traceS('onReject from ' + qbID);
			_this.onRejectCallback(qbID);
			break;
		case QBSignalingType.STOP:
			traceS('onStop from ' + qbID);
			_this.onStopCallback(qbID, body);
			break;
		case QBSignalingType.CANDIDATE:
			_this.onCandidateCallback(body);
			break;
		}
		
		return true;
	};
	
	this.sendMessage = function(userID, type, data, sessionID, userAvatar) {
		var reply, params, opponentJID = _this.getJID(userID);
		
		params = {
			to: opponentJID,
			from: _this.connection.jid, 
			type: type
		};
		
		reply = $msg(params).c('body').t(data).up().c('session').t(sessionID);
		if (userAvatar)
			reply.up().c('avatar').t(userAvatar);
		_this.connection.send(reply);
	};
	
	// set WebRTC callbacks
	$(Object.keys(QBSignalingType)).each(function() {
		_this.connection.addHandler(_this.onMessage, null, 'message', QBSignalingType[this], null, null);
	});
	
	// helpers
	this.getJID = function(id) {
		return id + "-" + _this.appID + "@" + _this.chatServer;
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

QBVideoChatSignaling.prototype.call = function(userID, sessionDescription, sessionID, userAvatar) {
	traceS('call to ' + userID);
	this.sendMessage(userID, QBSignalingType.CALL, sessionDescription, sessionID, userAvatar);
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
