/*
 * QuickBlox VideoChat WebRTC signaling library
 * version 0.02
 *
 * Author: Igor Khomenko (igor@quickblox.com)
 *
 */
 
// QB Account params
var QBPARAMS = {
                        app_id      : '92',
                        auth_key    : 'wJHdOcQSxXQGWx5',
                        auth_secret : 'BTFsj7Rtt27DAmT'
}

//Chat params
var CHAT = {
                        server      : 'chat.quickblox.com',
                        bosh_url    : 'http://chat.quickblox.com:5280'
}

var QB_CALL = 'qbvideochat_call';
var QB_ACCEPT = 'qbvideochat_acceptCall';
var QB_REJECT = 'qbvideochat_rejectCall';
var QB_CANDIDATE = 'qbvideochat_candidate';
var QB_STOPCALL = 'qbvideochat_stopCall';

/*
  Public methods:
  	- connect({login: login, password: password})
  	- call(userID, sessionDescription, sessionID)
  	- accept(userID, sessionDescription, sessionID)
  	- reject(userID, sessionID)
  	- sendCandidate(userID, candidate, sessionID)
  	- stop(userID, reason, sessionID)

  Public callbacks:
   	- onConnectionSuccess(user_id)
	- onConnectionFailed(error)
	- onConnectionDisconnected()
	- onCall(fromUserID, sessionDescription, sessionID)
	- onAccept(fromUserID, sessionDescription, sessionID)
	- onReject(fromUserID)
	- onCandidate(fromUserID, candidate)
	- onStop(fromUserID, reason)
 */
 
function QBVideoChatSignaling(){

	// set callbacks
	this.onConnectionSuccessCallbacks = [];
	this.onConnectionFailedCallbacks = [];
 	this.onConnectionDisconnectedCallbacks = [];
 	//
	this.onCallCallbacks = [];
 	this.onAcceptCallbacks = [];
 	this.onRejectCallbacks = [];
 	this.onCandidateCallbacks = [];
 	this.onStopCallbacks = [];
 	
 	var self = this; 

	this.xmppConnect = function(user_id, password) {
		this.connection = new Strophe.Connection(CHAT.bosh_url);
		this.connection.rawInput = this.rawInput;
		this.connection.rawOutput = this.rawOutput;
 		this.connection.addHandler(this.onMessage, null, 'message', QB_CALL, null,  null);
 		this.connection.addHandler(this.onMessage, null, 'message', QB_ACCEPT, null,  null); 
 		this.connection.addHandler(this.onMessage, null, 'message', QB_REJECT, null,  null); 
 		this.connection.addHandler(this.onMessage, null, 'message', QB_CANDIDATE, null,  null);
 		this.connection.addHandler(this.onMessage, null, 'message', QB_STOPCALL, null,  null); 
 
		traceS(this.connection);

		this.userJID = user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server;
		traceS('Connecting to Chat: userJID=' + this.userJID + ', password=' + password);
	

		this.connection.connect(this.userJID, password, function (status) {
			switch (status) {
			case Strophe.Status.ERROR:
				traceS('[Connection] Error');
				break;
			case Strophe.Status.CONNECTING:
				traceS('[Connection] Connecting');
				break;
			case Strophe.Status.CONNFAIL:
				for (var i=0; i < self.onConnectionFailedCallbacks.length; i++) {
					var callback = self.onConnectionFailedCallbacks[i];
					if (typeof(callback) === "function") {
						callback('[Connection] Failed to connect');
					}
				}
				break;
			case Strophe.Status.AUTHENTICATING:
				traceS('[Connection] Authenticating');
				break;
			case Strophe.Status.AUTHFAIL:
				for (var i=0; i < self.onConnectionFailedCallbacks.length; i++) {
					var callback = self.onConnectionFailedCallbacks[i];
					if (typeof(callback) === "function") {
						callback('[Connection] Unauthorized');
					}
				}
				break;
			case Strophe.Status.CONNECTED:
				traceS('[Connection] Connected');
				for (var i=0; i < self.onConnectionSuccessCallbacks.length; i++) {
					var callback = self.onConnectionSuccessCallbacks[i];
					if (typeof(callback) === "function") {
						callback(user_id);
					}
				}
				
				break;
			case Strophe.Status.DISCONNECTED:
				traceS('[Connection] Disconnected');
				break;
			case Strophe.Status.DISCONNECTING:
				traceS('[Connection] Disconnecting');
				for (var i=0; i < self.onConnectionDisconnectedCallbacks.length; i++) {
					var callback = self.onConnectionDisconnectedCallbacks[i];
					if (typeof(callback) === "function") {
						callback();
					}
				}
				break;
			case Strophe.Status.ATTACHED:
				traceS('[Connection] Attached');
				break;
			}
		});
	}
	
	this.rawInput = function(data) {
    	//traceS('RECV: ' + data);
	}

	this.rawOutput = function(data) {
    	//traceS('SENT: ' + data);
	}	

	this.onMessage = function(msg) {
		var to = msg.getAttribute('to');
		var from = msg.getAttribute('from');
		var type = msg.getAttribute('type');
		var elems = msg.getElementsByTagName('body');
		var body = Strophe.getText(elems[0]);
		 
		//traceS('onMessage: from ' + from + ',type: ' + type);
		 
		var fromUserID = from.split('-')[0];
		
		var sessionID = '110101010101';
	
		switch (type) {
		case QB_CALL:
			for (var i=0; i < self.onCallCallbacks.length; i++) {
				var callback = self.onCallCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID, body, sessionID);
				}
			}
			break;
		case QB_ACCEPT:
			for (var i=0; i < self.onAcceptCallbacks.length; i++) {
				var callback = self.onAcceptCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID, body, sessionID);
				}
			}
			break;
		case QB_REJECT:
			for (var i=0; i < self.onRejectCallbacks.length; i++) {
				var callback = self.onRejectCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID);
				}
			}
			break;
		case QB_CANDIDATE:
			for (var i=0; i < self.onCandidateCallbacks.length; i++) {
				var callback = self.onCandidateCallbacks[i];
				if (typeof(callback) === "function") {
					var jsonCandidate = self.xmppTextToDictionary(body);
					callback(fromUserID, jsonCandidate, sessionID);
				}
			}
			break;
		case QB_STOPCALL:
			for (var i=0; i < self.onStopCallbacks.length; i++) {
				var callback = self.onStopCallbacks[i];
				if (typeof(callback) === "function") {
					callback(fromUserID, body, sessionID);
				}
			}
			break;
		}

		// we must return true to keep the handler alive.  
		// returning false would remove it after it finishes.
		return true;
	}
	
	this.sendMessage = function(userID, type, data, sessionID) {
		var opponentJID = userID + "-" + QBPARAMS.app_id + "@" + CHAT.server;
		var body = data == null ? '' : data;
	
		var reply = $msg({to: opponentJID, 
						 from: this.userJID, 
						 type: type})
				.cnode(Strophe.xmlElement('body', body));
		
		this.connection.send(reply);
	}

	this.xmppTextToDictionary = function(data) {
		try {
			return $.parseJSON(Strophe.unescapeNode(data));
		} catch(err) {
			return Strophe.unescapeNode(data);
		}
	}

	this.xmppDictionaryToText = function(data) {
		return Strophe.escapeNode(JSON.stringify(data));
	}
}
 
QBVideoChatSignaling.prototype.login = function (params){
	// Init QB application
	//
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	
	// Create session
	// 
	var self = this; 
	QB.createSession(params, function(err, result){
		if (err) {
			for (var i=0; i < self.onConnectionFailedCallbacks.length; i++) {
				var callback = self.onConnectionFailedCallbacks[i];
				if (typeof(callback) === "function") {
					callback(err.detail);
				}
			}

		} else {
			traceS(result);
		
		    // Login to Chat
		    //
		    self.xmppConnect(result.user_id, params['password']);
		}
	});
}

QBVideoChatSignaling.prototype.call = function(userID, sessionDescription, sessionID) {
	traceS('call ' + userID);
    this.sendMessage(userID, QB_CALL, sessionDescription, sessionID);
}

QBVideoChatSignaling.prototype.accept = function(userID, sessionDescription, sessionID) {
	traceS('accept ' + userID);
    this.sendMessage(userID, QB_ACCEPT, sessionDescription, sessionID);
}

QBVideoChatSignaling.prototype.reject = function(userID, sessionID) {
	traceS('reject ' + userID);
    this.sendMessage(userID, QB_REJECT, null, sessionID);
}

QBVideoChatSignaling.prototype.sendCandidate = function(userID, candidate, sessionID) {
	//traceS('sendCandidate ' + userID + ', candidate: ' + candidate);
    this.sendMessage(userID, QB_CANDIDATE, candidate, sessionID);
}

QBVideoChatSignaling.prototype.stop = function(userID, reason, sessionID) {
	traceS('stop ' + userID);
    this.sendMessage(userID, QB_STOPCALL, reason, sessionID);
}


// callbacks

QBVideoChatSignaling.prototype.addOnConnectionSuccessCallback = function(callback) {
	this.onConnectionSuccessCallbacks.push(callback);
	traceS("addOnConnectionSuccessCallback, count= " + this.onConnectionSuccessCallbacks.length);
}

QBVideoChatSignaling.prototype.addOnConnectionFailedCallback = function(callback) {
	this.onConnectionFailedCallbacks.push(callback);
}

QBVideoChatSignaling.prototype.addOnConnectionDisconnectedCallback = function(callback) {
	this.onConnectionDisconnectedCallbacks.push(callback);
}

QBVideoChatSignaling.prototype.addOnCallCallback = function(callback) {
	this.onCallCallbacks.push(callback);
}

QBVideoChatSignaling.prototype.addOnAcceptCallback = function(callback) {
	this.onAcceptCallbacks.push(callback);
}

QBVideoChatSignaling.prototype.addOnRejectCallback = function(callback) {
	this.onRejectCallbacks.push(callback);
}

QBVideoChatSignaling.prototype.addOnCandidateCallback = function(callback) {
	this.onCandidateCallbacks.push(callback);
}


function traceS(text) {
	console.log("[qb_videochat_signalling]: " + text);
}
