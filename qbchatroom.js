/**
 * QB Group Chat Room (XMPP)
 * version 2.1.1
 * 
 * author: Andrey Povelichenko <andrey.povelichenko@quickblox.com>
 */

var storage, params, connection;
var isFBConnected = false;
var isSubscribeEnabled = false;
var chatUser = {
	nick: null,
	avatar: null,
	qb: {
		id: null,
		blob_id: null,
		token: null
	},
	fb: {
		id: null,
		access_token: null
	}
};

$(document).ready(function() {
	QB.init(QBAPP.app_id, QBAPP.auth_key, QBAPP.auth_secret);
	
	$.ajaxSetup({ cache: true });
	$.getScript('https://connect.facebook.net/en_EN/all.js', function() {
		FB.init({
			appId: FBAPP_ID,
			cookie: true
		});
		
		autoLogin();
		changeInputFileBehavior();
		changeHeightChatBlock();
		getSmiles();
		updateTime();
		sendMesage();
		
		$('#authFB').click(function(){ authFB() });
		$('#authQB').click(function(){ authQB() });
		$('#signUp').click(function(){ signUp(); return false; });
		$('#dataLogin').click(function(){ prepareDataForLogin(); return false; });
		$('#dataSignup').click(function(){ prepareDataForSignUp(); return false; });
		$('.users').click(function(){ showList('.users'); return false; });
		$('.smiles').click(function(){ showList('.smiles'); return false; });
		$('.smiles-list *').click(function() { choseSmile(this); });
		$('.logout').click(function(){ logout(); return false; });
	});
});

/* Authorization Module
--------------------------------------------------------------------------*/
function autoLogin() {
	if (localStorage['qbAuth']) {
		// Autologin as QB user
		storage = $.parseJSON(localStorage['qbAuth']);
		createSession(storage);
	} else {
		// Autologin as FB user
		subscribeFBStatusEvent();
		isFBConnected = true;
		isSubscribeEnabled = true;
	}
}

function subscribeFBStatusEvent() {
	if (!isSubscribeEnabled) {
		FB.Event.subscribe('auth.statusChange', function(response) {
			console.log('FB ' + response.status);
			if (response.status == 'connected')
				getFBUser(response.authResponse.accessToken);
		});
	}
}

function getFBUser(accessToken) {
	FB.api('/me', function(response) {
		chatUser.fb.id = response.id;
		chatUser.fb.access_token = accessToken;
		
		chatUser.nick = response.name;
		chatUser.avatar = 'https://graph.facebook.com/' + response.id + '/picture/';
		
		createSession();
	});
}

function authFB() {
	FB.getLoginStatus(function(response) {
		console.log('FB ' + response.status);
		switch (response.status) {
		case 'connected':
			if (!isFBConnected)
				getFBUser(response.authResponse.accessToken);
			break;
		case 'not_authorized':
			FB.login();
			break;
		default:
			FB.login();
			break;
		}
	});
	
	subscribeFBStatusEvent();
	isSubscribeEnabled = true;
}

function authQB() {
	$('.bubbles').addClass('bubbles_login');
	$('.header').addClass('header_login');
	$('#auth').hide();
	$('#login-fom').show();
	$('#login-fom input').val('').removeClass('error');
}

/* QB Module (find the user)
-----------------------------------------------------------------------------*/
function prepareDataForLogin() {
	storage = {
		login: $('#login').val(),
		pass: $('#pass').val()
	};
	
	// check if the user left empty fields
	if (trim(storage.login) && trim(storage.pass))
		createSession(storage);
	else
		connectFailure();
}

function createSession(storage) {
	$('#main').hide();
	$('#connecting').show();
	
	if (chatUser.fb.access_token) {
		// via Facebook
		params = {provider: 'facebook', keys: {token: chatUser.fb.access_token}};
	} else if (storage.login.indexOf('@') > 0) {
		// via QB email and password
		params = {email: storage.login, password: storage.pass};
	} else {
		// via QB login and password
		params = {login: storage.login, password: storage.pass};
	}
	
	QB.createSession(params, function(err, result) {
		if (err) {
			console.log(err.detail);
			connectFailure();
		} else {
			chatUser.qb.token = result.token;
			getQBUser(result.user_id, storage);
		}
	});
}

function getQBUser(user_id, storage) {
	QB.users.get({id: user_id}, function(err, result) {
		if (err) {
			console.log(err.detail);
			connectFailure();
		} else {
			chatUser.qb.id = result.id;
			chatUser.qb.blob_id = result.blob_id;
			
			if (!chatUser.nick)	chatUser.nick = result.full_name;
			
			if (!chatUser.avatar && chatUser.qb.blob_id) {
				QB.content.getFileUrl(chatUser.qb.blob_id, function(err, result) {
					if (err) {
						console.log(err.detail);
						connectFailure();
					} else {
						chatUser.avatar = result;
					}
				});
			}
			
			connectChat(chatUser, storage);
		}
	});
}

/* QB Module (creating the user)
--------------------------------------------------------------------------------*/
function signUp() {
	$('#main').hide();
	$('#signup-form').show();
	$('#signup-form input').val('').removeClass('error').prop('disabled', false);
}

function prepareDataForSignUp() {
	if ($('#signup-form input:first').is(':disabled')) return false;
	
	$('#signup-form input').removeClass('error');

	// check if the user left empty fields
	$([$('#signup_name'), $('#signup_email'), $('#signup_login'), $('#signup_pass')]).each(function() {
		if (!trim(this.val()))
			this.addClass('error');
	});
	
	if ($('#signup-form input').is('.error')) return false;
	
	$('#signup-form input').prop('disabled', true);
	createUser();
}

function createUser() {
	var file = $('#signup_avatar')[0].files[0];
	params = {
		full_name: $('#signup_name').val(),
		email: $('#signup_email').val(),
		login: $('#signup_login').val(),
		password: $('#signup_pass').val()
	};
	
	QB.createSession(function(err, result) {
		if (err) {
			console.log(err.detail);
			signUpFailure();
		} else {
			
			QB.users.create(params, function(err, result) {
				if (err) {
					console.log(err.detail);
					signUpFailure();
				} else if (file) {
					createBlob(file, params);
				} else {
					signUpSuccess();
				}
			});
		}
	});
}

function createBlob(file, data) {
	var user_id;
	params = {
		login: data.login,
		password: data.password
	};
	
	QB.login(params, function(err, result) {
		if (err) {
			console.log(err.detail);
			signUpFailure();
		} else {
			user_id = result.id;
			
			QB.content.createAndUpload({file: file, public: true}, function(err, result) {
				if (err) {
					console.log(err.detail);
					signUpFailure();
				} else {
					assignBlobToUser(result.id, user_id);
				}
			});
		}
	});
}

function assignBlobToUser(blob, user) {
	QB.users.update({id: user, blob_id: blob}, function(err, result) {
		if (err) {
			console.log(err.detail);
			signUpFailure();
		} else {
			signUpSuccess();
		}
	});
}

/* Chat Module
-----------------------------------------------------------------------*/
function connectChat(chatUser, storage) {
	var userJID = chatUser.qb.id + "-" + QBAPP.app_id + "@" + CHAT.server;
	var userPass = chatUser.fb.id ? chatUser.qb.token : storage.pass;
	
	connection = new Strophe.Connection(CHAT.bosh_server);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	
	connection.connect(userJID, userPass, function (status) {
		switch (status) {
		case Strophe.Status.ERROR:
			console.log('[Connection] Error');
			break;
		case Strophe.Status.CONNECTING:
			console.log('[Connection] Connecting');
			break;
		case Strophe.Status.CONNFAIL:
			console.log('[Connection] Failed to connect');
			connectFailure();
			break;
		case Strophe.Status.AUTHENTICATING:
			console.log('[Connection] Authenticating');
			break;
		case Strophe.Status.AUTHFAIL:
			console.log('[Connection] Unauthorized');
			connectFailure();
			break;
		case Strophe.Status.CONNECTED:
			console.log('[Connection] Connected');
			
			if (storage) localStorage['qbAuth'] = JSON.stringify(storage);
			
			connectSuccess();
			connection.muc.join(CHAT.room_jid, chatUser.nick, getMessage, getPresence, getRoster);
			break;
		case Strophe.Status.DISCONNECTING:
			console.log('[Connection] Disconnecting');
			logoutSuccess();
			break;
		case Strophe.Status.DISCONNECTED:
			console.log('[Connection] Disconnected');
			break;
		case Strophe.Status.ATTACHED:
			console.log('[Connection] Attached');
			break;
		}
	});
}

function rawInput(data) {console.log('RECV: ' + data);}
function rawOutput(data) {console.log('SENT: ' + data);}

function getRoster(users, room) {
	var occupants = Object.keys(users);
	
	$('.users-count').text(occupants.length);
	$('.users-list').html('<li class="users-list-title">Occupants</li>');
	
	$(occupants).each(function() {
		var user = Strophe.unescapeNode(users[this].nick);
		$('.users-list').append('<li class="user">' + user + '</li>');
	});
  
  return true;
}

function getPresence(stanza, room) {
	console.log('[XMPP] Presence');
	
	var messagesCount = $('.message').length;
	var type = $(stanza).attr('type');
	var user = getAuthorName($(stanza).attr('from'));
	
	if (messagesCount > 0 && type && user != 'admin') {
		$('.chat-content').append('<span class="service-message left">' + user + ' has left this chat.</span>');
		$('.chat-content').scrollTo('.left:last', 0);
	} else if (messagesCount > 0 && user != 'admin') {
		$('.chat-content').append('<span class="service-message joined">' + user + ' has joined the chat.</span>');
		$('.chat-content').scrollTo('.joined:last', 0);
	}
	
	return true;
}

function getMessage(stanza, room) {
	console.log('[XMPP] Message');
	var html;
	
	var defaultAvatar = 'images/avatar_default.png';
	var response = $(stanza).find('body').context.textContent;
	var author = $(stanza).attr('from');
	var time = $(stanza).find('delay').attr('stamp');
	
	response = checkResponse(response);
	author = getAuthorName(author);
	time = time ? time : (new Date()).toISOString();
	
	html = '<section class="message">';
	html += '<img class="message-avatar" src="' + (response.avatar ? response.avatar : defaultAvatar) + '" alt="avatar">';
	html += '<div class="message-body">';
	html += '<div class="message-description">' + (response.message ? parser(response.message) : parser(response)) + '</div>';
	html += '<footer><span class="message-author">' + author + '</span>';
	html += '<time class="message-time" datetime="' + time + '">' + $.timeago(time) + '</time></footer>';
	html += '</div></section>';
	
	$('.chat-content').append(html).find('.message:odd').addClass('white');
	$('.chat-content .message:last').fadeTo(500, 1);
	$('.chat-content').scrollTo('.message:last', 0);

	return true;
}

function sendMesage() {
	var message, post;
	
	$('#message').keydown(function(event) {
		if (event.keyCode == 13 && !event.shiftKey) {
			post = $('#message').val();
			
			if (trim(post)) {
				message = {message: post, avatar: chatUser.avatar};
				message = Strophe.escapeNode(JSON.stringify(message));
				connection.muc.groupchat(CHAT.room_jid, message);
				
				$('#message').val('');
			}
			return false;
		}
	});
}

function logout() {
	connection.muc.leave(CHAT.room_jid, chatUser.nick);
	localStorage.removeItem('qbAuth');
	if (chatUser.fb.id) {
		FB.logout();
		isFBConnected = false;
	}
	
	chatUser.nick = null;
	chatUser.avatar = null;
	chatUser.qb.id = null;
	chatUser.qb.blob_id = null;
	chatUser.qb.token = null;
	chatUser.fb.id = null;
	chatUser.fb.access_token = null;
	
	/*
	 * TODO:
	 * Disconnect from chat must be implemented
	 * in callback of MUC leave function
	 */
	setTimeout(function() {
		connection.disconnect();
	}, 1500);
}
