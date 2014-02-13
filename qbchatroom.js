/**
 * QB Group Chat Room (XMPP)
 * version 2.1.1
 * 
 * author: Andrey Povelichenko <andrey.povelichenko@quickblox.com>
 */

var params, connection, chatUser = {}, presenceIDs = {}, namesOccupants = {};

var switches = {
	isLogout: false,
	isComposing: false,
	isReceivingOccupants: false
};

$(document).ready(function() {
	$.ajaxSetup({ cache: true });
	$.getScript('https://connect.facebook.net/en_EN/all.js', function() {
		FB.init({
			appId: FBAPP_ID,
			status: false
		});
		
		autoLogin();
		subscribeFBStatusEvent();
		changeInputFileBehavior();
		changeHeightChatBlock();
		getSmiles();
		clickBehavior();
		updateTime();
		sendMesage();
		
		$('#authFB').click(function(){ authFB() });
		$('#authQB').click(function(){ authQB() });
		$('#signUp').click(function(){ signUp(); return false; });
		$('.logout').click(function(){ logout(); return false; });
		$('.smiles-list *').click(function() { choseSmile(this); });
		$('.users').click(function(){ showList('.users'); return false; });
		$('.smiles').click(function(){ showList('.smiles'); return false; });
		$('#dataLogin').click(function(){ prepareDataForLogin(); return false; });
		$('#dataSignup').click(function(){ prepareDataForSignUp(); return false; });
	});
});

/* Authorization Module
--------------------------------------------------------------------------*/
function autoLogin() {
	if (localStorage['QBChatUser']) {
		connecting();
		chatUser = $.parseJSON(localStorage['QBChatUser']);
		connectChat(chatUser);
		
		QB.init(chatUser.qbToken);
	} else {
		QB.init(QBAPP.appID, QBAPP.authKey, QBAPP.authSecret);
	}
}

function subscribeFBStatusEvent() {
	FB.Event.subscribe('auth.statusChange', function(response) {
		console.log('FB ' + response.status);
		if (response.status == 'connected')
			createSession(null, response.authResponse.accessToken);
	});
}

function authFB() {
	FB.getLoginStatus(function(response) {
		console.log('FB ' + response.status);
		switch (response.status) {
		case 'connected':
			createSession(null, response.authResponse.accessToken);
			break;
		case 'not_authorized':
			FB.login();
			break;
		default:
			FB.login();
			break;
		}
	});
}

function authQB() {
	$('.bubbles').addClass('bubbles_login');
	$('.header').addClass('header_login');
	$('#auth').hide();
	$('#login-form').show();
	$('#login-form input').val('').removeClass('error');
}

/* QB Module (find the user)
-----------------------------------------------------------------------------*/
function prepareDataForLogin() {
	var storage;
	
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

function createSession(storage, accessToken) {
	connecting();
	
	if (accessToken) {
		// via Facebook
		params = {provider: 'facebook', keys: {token: accessToken}};
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
			getQBUser(result.user_id, result.token, storage.pass);
		}
	});
}

function getQBUser(user_id, token, pass) {
	QB.users.get(user_id, function(err, result) {
		if (err) {
			console.log(err.detail);
			connectFailure();
		} else {
			chatUser.qbID = String(user_id);
			chatUser.qbToken = token;
			chatUser.qbPass = pass;
			chatUser.fbID = result.facebook_id;
			chatUser.name = result.full_name;
			
			if (result.blob_id) {
				QB.content.getFileUrl(result.blob_id, function(err, result) {
					if (err) {
						console.log(err.detail);
						connectFailure();
					} else {
						chatUser.avatar = result;
					}
				});
			} else {
				chatUser.avatar = chatUser.fbID ? 'https://graph.facebook.com/' + chatUser.fbID + '/picture/' : null;
			}
			
			connectChat(chatUser);
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
			
			QB.content.createAndUpload({file: file, 'public': true}, function(err, result) {
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

/* One to One Chat Module
-----------------------------------------------------------------------*/
function connectChat(chatUser) {
	var userJID = chatUser.qbID + "-" + QBAPP.appID + "@" + CHAT.server;
	var userPass = chatUser.qbPass || chatUser.qbToken;
	
	connection = new Strophe.Connection(CHAT.bosh);
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
			connectSuccess();
			
			localStorage['QBChatUser'] = JSON.stringify(chatUser);
			connection.muc.join(CHAT.roomJID, chatUser.qbID, getMessage, getPresence, getRoster);
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

function rawInput(data) {/*console.log('RECV: ' + data);*/}
function rawOutput(data) {/*console.log('SENT: ' + data);*/}

function sendMesage() {
	var message, post;
	
	$('#message').keydown(function(event) {
		if (!switches.isComposing)
			sendComposing();
		
		if (event.keyCode == 13 && !event.shiftKey) {
			post = $('#message').val();
			if (trim(post)) {
				sendPaused();
				
				message = {
					message: post,
					name: chatUser.name,
					avatar: chatUser.avatar,
					fb: chatUser.fbID
				};
				
				message = Strophe.escapeNode(JSON.stringify(message));
				connection.muc.groupchat(CHAT.roomJID, message);
				$('#message').val('');
			}
			return false;
		}
	});
	
	function sendComposing() {
		switches.isComposing = true;
		connection.chatstates.sendComposing(CHAT.roomJID, 'groupchat');
		setTimeout(sendPaused, 5000);
	}
	
	function sendPaused() {
		switches.isComposing = false;
		connection.chatstates.sendPaused(CHAT.roomJID, 'groupchat');
	}
}

function logout() {
	switches.isLogout = true;
	disconnectChat(chatUser.qbID);
	
	chatUser = {};
	presenceIDs = {};
	namesOccupants = {};
	switches.isReceivingOccupants = false;
	localStorage.removeItem('QBChatUser');
}

function disconnectChat(nick) {
	connection.muc.leave(CHAT.roomJID, nick);
	connection.flush();
	connection.disconnect();
}

/* Group Chat Room Module
-----------------------------------------------------------------------*/
function getRoster(users, room) {
	var usersCount = Object.keys(users).length;
	$('.users-count').text(usersCount);
	if (!switches.isReceivingOccupants) getOccupants();
	return true;
}

function getPresence(stanza, room) {
	console.log('[XMPP] Presence');
	var user, type, qbID, name, storageLength = Object.keys(namesOccupants).length;
	
	user = $(stanza).attr('from');
	type = $(stanza).attr('type');
	qbID = getID(user);
	
	if (type)
		delete presenceIDs[qbID];
	else
		presenceIDs[qbID] = true;
	
	if (storageLength == 0) return true;
	
	if (type) {
		name = namesOccupants[qbID];
		delete namesOccupants[qbID];
		$('.user:contains(' + name + ')').remove();
		
		$('.chat-content').append('<span class="service-message left">' + name + ' has left this chat.</span>');
		$('.chat-content').scrollTo('*:last', 0);
		
		if (qbID == chatUser.qbID && !switches.isLogout) window.location.reload();
	} else {
		getOneOccupant(qbID);
	}

	return true;
}

function getMessage(stanza, room) {
	var html, author, response, time, composing, paused;
	var qbID, message, name, avatar, fbID, icon, defaultAvatar = 'images/avatar_default.png';

	author = $(stanza).attr('from');
	response = $(stanza).find('body').context.textContent;
	time = $(stanza).find('delay').attr('stamp');
	
	composing = $(stanza).find('composing')[0];
	paused = $(stanza).find('paused')[0];
	
	qbID = getID(author);
	
	if (!response && composing || paused) {
		showComposing(composing, qbID);
	} else {
		console.log('[XMPP] Message');
		response = checkResponse(response);
		
		message = response.message ? parser(response.message, time) : parser(response, time);
		name = response.name || qbID;
		avatar = response.avatar || defaultAvatar;
		fbID = response.fb || '';
		time = time || (new Date()).toISOString();
		//icon = response.fb ? 'images/fb_auth.png' : 'images/qb_auth.png';
		
		html = '<section class="message show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '" onclick="showActionToolbar(this)">';
		//html += '<img class="message-icon" src="' + icon + '" alt="icon">';
		html += '<img class="message-avatar" src="' + avatar + '" alt="avatar">';
		html += '<div class="message-body">';
		html += '<div class="message-description">' + message + '</div>';
		html += '<footer><span class="message-author">' + name + '</span>';
		html += '<time class="message-time" datetime="' + time + '">' + $.timeago(time) + '</time></footer>';
		html += '</div></section>';
		
		$('.loading_messages').remove();
		if ($('.typing').length > 0)
			$('.chat-content .typing:first').before(html);
		else
			$('.chat-content').append(html);
		$('.chat-content .message:odd').addClass('white');
		$('.chat-content .message:last').fadeTo(300, 1);
	}
	
	$('.chat-content').scrollTo('*:last', 0);
	return true;
}

function getOccupants() {
	var ocuppants, requestsCount, ids = [], limit = 100;
	switches.isReceivingOccupants = true;
	
	$('.users-list').html('<li class="users-list-title">Occupants</li>');
	createAnimatedLoadingUsers();
	
	connection.muc.queryOccupants(CHAT.roomJID, function(response) {
		ocuppants = $(response).find('item');
		for (var i = 0; i < ocuppants.length; i++)
			ids.push($(ocuppants[i]).attr('name'));
		
		requestsCount = ids.length / limit;
		for (var i = 1, c = 0; c < requestsCount; i++, c++) {
			params = {
				filter: {
					type: 'id',
					value: ids
				},
				perPage: limit,
				pageNo: i
			};
			
			QB.users.listUsers(params, function(err, result) {
				if (err) console.log(err.detail);
				$('.loading_users').remove();
				if ($('.message').length == 0)
					$('.loading_messages').remove();
				
				$(result.items).each(function() {
					var id = String(this.user.id);
					if (presenceIDs[id]) {
						delete presenceIDs[id];
						createUserList(this.user);
					}
				});
				
				ids = Object.keys(presenceIDs);
				for (var i = 0; i < ids.length; i++)
					getOneOccupant(ids[i]);
			});
		}
	});
}

function getOneOccupant(id) {
	var name;
	
	QB.users.get(parseInt(id), function(err, result) {
		if (err) console.log(err.detail);
		name = createUserList(result);
		$('.chat-content').append('<span class="service-message joined">' + name + ' has joined the chat.</span>');
		$('.chat-content').scrollTo('*:last', 0);
	});
}

/* Additional Features
-------------------------------------------------------------------------*/
function createUserList(user) {
	var qbID, fbID, name;
	
	qbID = String(user.id);
	fbID = user.facebook_id || '';
	name = user.full_name;
	//var iconClass = user.facebook_id ? 'user_fb_icon' : 'user_qb_icon';
	
	$('.users-list').append('<li class="user show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '" onclick="showActionToolbar(this)">' + name + '</li>');
	namesOccupants[qbID] = name;
	return name;
}

function showComposing(isShown, qbID) {
	var name, obj = $('.typing');
	
	if (Object.keys(namesOccupants).length == 0) return true;
	
	name = namesOccupants[qbID];
	if (isShown && qbID != chatUser.qbID) {
		if (obj.length > 0)
			obj.text(addTypingMessage(obj, name));
		else
			$('.chat-content').append('<span class="typing">' + name + ' ...</span>');
	} else {
		obj.text(removeTypingMessage(obj, name));
		if (obj.text().length == 0) obj.remove();
	}
}

function showActionToolbar(info) {
	var html, qbID, fbID, name;
	
	qbID = $(info).data('qb');
	fbID = $(info).data('fb');
	name = $(info).find('.message-author').text() || $(info).text();
	
	html = '<div class="action-group">';
	if (qbID != chatUser.qbID) {
		html += '<button class="btn btn_action" data-name="' + name + '" onclick="makeQuote(this)"><span>Reply</span></button>';
		html += '<button class="btn btn_action" data-qb="' + qbID + '"><span>Private message</span></button>';
	}
	html += fbID ? '<a href="https://facebook.com/' + fbID + '" target="_blank" class="btn btn_action"><span>View profile</span></a>' : '';
	html += '</div><div class="action-group">';
	html += '<button class="btn btn_action btn_cancel"><span>Cancel</span></button>';
	html += '</div>';
	
	$('.actions').html(html);
}

function makeQuote(btn) {
	var name, quote;
	
	name = $(btn).data('name').replace(/ /g, "%20");
	quote = '@'.concat(name).concat(' ');
	$('#message').focus().val(quote);
}

function takeQuote(str, time) {
	var quote, signal = $('#signal')[0];
	
	quote = str.split(' ')[0].charAt(0) == '@' && str.split(' ')[0];
	
	if (quote) {
		if (escapeSpace(quote.split('@')[1]) == chatUser.name && !time)
			signal.play();
		return str.replace(quote, '<b>' + escapeSpace(quote) + '</b>');
	} else {
		return str;
	}
	
	function escapeSpace(s) {
		return s.replace("%20", ' ');
	}
}
