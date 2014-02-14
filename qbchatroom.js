/**
 * QB Group Chat Room (XMPP)
 * version 2.1.1
 * 
 * author: Andrey Povelichenko <andrey.povelichenko@quickblox.com>
 */

var params, connection, chatUser = {}, namesOccupants = {};

var switches = {
	isLogout: false,
	isComposing: false,
	isFBconnected: false,
	isOccupantsDownloaded: false
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
		
		QB.init(chatUser.qbToken);
		connectChat(chatUser);
	}
}

function subscribeFBStatusEvent() {
	FB.Event.subscribe('auth.statusChange', function(response) {
		if (response.status == 'connected') {
			createSession(null, response.authResponse.accessToken);
			setTimeout(function() {switches.isFBconnected = true}, 1000);
		}
	});
}

function authFB() {
	FB.getLoginStatus(function(response) {
		switch (response.status) {
		case 'connected':
			if (switches.isFBconnected)
				createSession(null, response.authResponse.accessToken);
			break;
		case 'not_authorized':
			FB.login();
			break;
		case 'unknown':
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
	var storage = {
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
	
	QB.init(QBAPP.appID, QBAPP.authKey, QBAPP.authSecret);
	QB.createSession(params, function(err, result) {
		if (err) {
			console.log(err.detail);
			connectFailure();
		} else {
			getQBUser(result.user_id, result.token, (storage ? storage.pass : null));
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
			chatUser.qbPass = pass || token;
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

function getUsersList(data) {
	QB.users.listUsers(data, function(err, result) {
		if (err) {
			console.log(err.detail);
			if (err.message == 'Unauthorized')
				recoverySession(data);
		} else {
			$('.loading_users, .loading_messages').remove();
			switches.isOccupantsDownloaded = true;
			
			$(result.items).each(function() {
				createUsersList(this.user);
			});
		}
	});
}

function recoverySession(data) {
	QB.init(QBAPP.appID, QBAPP.authKey, QBAPP.authSecret);
	QB.createSession(function(err, result) {
		chatUser.qbToken = result.token;
		localStorage['QBChatUser'] = JSON.stringify(chatUser);
		getUsersList(data);
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
	
	QB.init(QBAPP.appID, QBAPP.authKey, QBAPP.authSecret);
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
	var userPass = chatUser.qbPass;
	
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
			
			connection.muc.join(CHAT.roomJID, chatUser.qbID, getMessage, getPresence, getRoster);
			setTimeout(getOccupants, 1000);
			setTimeout(scrollToMessage, 10 * 1000);
			localStorage['QBChatUser'] = JSON.stringify(chatUser);
			
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
		setTimeout(sendPaused, 5 * 1000);
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
	namesOccupants = {};
	switches.isOccupantsDownloaded = false;
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
	return true;
}

function getPresence(stanza, room) {
	console.log('[XMPP] Presence');
	var user, type, qbID, name;
	if (!switches.isOccupantsDownloaded) return true;
	
	user = $(stanza).attr('from');
	type = $(stanza).attr('type');
	qbID = getID(user);
	
	if (type) {
		name = namesOccupants[qbID];
		delete namesOccupants[qbID];
		$('.user[data-qb=' + qbID + ']').remove();
		$('.chat-content').append('<span class="service-message left">' + name + ' has left this chat.</span>');
		scrollToMessage();
	} else {
		getOneOccupant(qbID);
	}
	
	if (type && qbID == chatUser.qbID && !switches.isLogout)
			window.location.reload();
	
	return true;
}

function getMessage(stanza, room) {
	var html, author, response, createTime, messageTime, composing, paused;
	var qbID, message, name, avatar, fbID, icon, defaultAvatar = 'images/avatar_default.png';

	author = $(stanza).attr('from');
	response = $(stanza).find('body').context.textContent;
	createTime = $(stanza).find('delay').attr('stamp');
	
	composing = $(stanza).find('composing')[0];
	paused = $(stanza).find('paused')[0];
	
	qbID = getID(author);
	
	if (!response && composing || paused) {
		showComposing(composing, qbID);
	} else {
		console.log('[XMPP] Message');
		
		response = checkResponse(response);
		messageTime = createTime || (new Date()).toISOString();
		
		message = response.message || response;
		name = response.name || qbID;
		avatar = response.avatar || defaultAvatar;
		fbID = response.fb || '';
		//icon = response.fb ? 'images/fb_auth.png' : 'images/qb_auth.png';
		
		html = '<section class="message show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '" onclick="showActionToolbar(this)">';
		//html += '<img class="message-icon" src="' + icon + '" alt="icon">';
		html += '<img class="message-avatar" src="' + avatar + '" alt="avatar">';
		html += '<div class="message-body">';
		html += '<div class="message-description">' + parser(message, createTime) + '</div>';
		html += '<footer><span class="message-author">' + name + '</span>';
		html += '<time class="message-time" datetime="' + messageTime + '">' + $.timeago(messageTime) + '</time></footer>';
		html += '</div></section>';

		if ($('span').is('.typing'))
			$('.chat-content .typing').before(html);
		else
			$('.chat-content').append(html);
		
		$('.loading_messages').remove();
		$('.chat-content .message:odd').addClass('white');
		if (createTime) {
			$('.chat-content .message:last').fadeTo(0, 1);
		} else {
			$('.chat-content .message:last').fadeTo(300, 1);
			scrollToMessage();
		}
	}
	
	return true;
}

function getOccupants() {
	var ocuppants, requestsCount, ids = [], limit = 100;
	
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
			
			getUsersList(params);
		}
	});
}

function getOneOccupant(id) {
	QB.users.get(parseInt(id), function(err, result) {
		if (err) {
			console.log(err.detail);
		} else {
			createUsersList(result);
			$('.chat-content').append('<span class="service-message joined">' + result.full_name + ' has joined the chat.</span>');
			scrollToMessage();
		}
	});
}

/* Additional Features
-------------------------------------------------------------------------*/
function createUsersList(user) {
	var qbID, fbID, name;
	
	qbID = String(user.id);
	fbID = user.facebook_id || '';
	name = user.full_name;
	//var iconClass = user.facebook_id ? 'user_fb_icon' : 'user_qb_icon';
	
	$('.users-list').append('<li class="user show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '" onclick="showActionToolbar(this)">' + name + '</li>');
	namesOccupants[qbID] = name;
}

function showComposing(composing, qbID) {
	var name, obj = $('.typing');
	if (!switches.isOccupantsDownloaded) return false;
	
	name = namesOccupants[qbID];
	if (composing && qbID != chatUser.qbID) {
		if ($('span').is('.typing'))
			obj.text(addTypingMessage(obj, name));
		else {
			$('.chat-content').append('<span class="typing">' + name + ' ...</span>');
			scrollToMessage();
		}
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
