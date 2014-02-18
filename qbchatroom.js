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
		
		$('#authFB').click(authFB);
		$('#authQB').click(authQB);
		$('#signUp').click(signUp);
		$('#dataLogin').click(prepareDataForLogin);
		$('#dataSignup').click(prepareDataForSignUp);
		$('.smiles-list img').click(choseSmile);
		
		$('#chats-wrap').on('click', '.logout', logout);
		$('#chats-wrap').on('click', '.show-actions', showActionToolbar);
		$('#chats-wrap').on('click', '.users', {list: '.users-list'}, showList);
		$('#chats-wrap').on('click', '.chats', {list: '.chats-list'}, showList);
		$('#chats-wrap').on('click', '.smiles', {list: '.smiles-list'}, showList);
		$('.actions-wrap').on('click', '.btn_quote', makeQuote);
		$('.actions-wrap').on('click', '.btn_private', createPrivateChat);
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
function prepareDataForLogin(event) {
	event.preventDefault();
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
function signUp(event) {
	event.preventDefault();
	$('#main').hide();
	$('#signup-form').show();
	$('#signup-form input').val('').removeClass('error').prop('disabled', false);
}

function prepareDataForSignUp(event) {
	event.preventDefault();
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
			localStorage['QBChatUser'] = JSON.stringify(chatUser);
			
			setTimeout(function() {$('.loading_messages').remove()}, 2 * 1000);
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
	
	$('.send-message').keydown(function(event) {
		if (!switches.isComposing)
			sendComposing();
		
		if (event.keyCode == 13 && !event.shiftKey) {
			post = $(this).val();
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
				$(this).val('');
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

function logout(event) {
	event.preventDefault();
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
	$('#chat-room .users-count').text(usersCount);
	
	return true;
}

function getPresence(stanza, room) {
	console.log('[XMPP] Presence');
	var user, type, time, qbID, name, obj = $('.typing');
	
	user = $(stanza).attr('from');
	type = $(stanza).attr('type');
	time = (new Date()).toISOString();
	qbID = getID(user);
	
	if (type) {
		if (typeof(namesOccupants[qbID]) == "string") {
			name = namesOccupants[qbID];
			removeTypingMessage(obj, name);
			
			$('.list-item[data-qb=' + qbID + ']').remove();
			$('.chat-content').append('<span class="service-message left" data-time="' + time + '">' + name + ' has left this chat.</span>');
			scrollToMessage('.chat:visible');
		}
		delete namesOccupants[qbID];
	} else {
		namesOccupants[qbID] = true;
		if (switches.isOccupantsDownloaded)
			getOneOccupant(qbID, time);
	}
	
	if (type && qbID == chatUser.qbID && !switches.isLogout)
		window.location.reload();
	
	return true;
}

function getMessage(stanza, room) {
	var html, author, response, createTime, messageTime, composing, paused;
	var qbID, message, name, avatar, fbID, icon, defaultAvatar = 'images/avatar_default.png';
	if (!switches.isOccupantsDownloaded && $('#chat-room .message').length > 1)
		getOccupants();
	
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
		$('.loading_messages').remove();
		
		response = checkResponse(response);
		messageTime = createTime || (new Date()).toISOString();
		
		message = response.message || response;
		name = response.name || qbID;
		avatar = response.avatar || defaultAvatar;
		fbID = response.fb || '';
		//icon = response.fb ? 'images/fb_auth.png' : 'images/qb_auth.png';
		
		html = '<section class="message show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '">';
		//html += '<img class="message-icon" src="' + icon + '" alt="icon">';
		html += '<img class="message-avatar" src="' + avatar + '" alt="avatar">';
		html += '<div class="message-body">';
		html += '<div class="message-description">' + parser(message, createTime) + '</div>';
		html += '<footer><span class="message-author">' + name + '</span>';
		html += '<time class="message-time" datetime="' + messageTime + '">' + $.timeago(messageTime) + '</time></footer>';
		html += '</div></section>';
		
		if ($('#chat-room span').is('.typing'))
			$('#chat-room .typing').before(html);
		else if ($('#chat-room .service-message:last').data('time') > messageTime)
			$('#chat-room .service-message:first').before(html);		
		else
			$('#chat-room .chat-content').append(html);
		
		if (createTime)
			$('#chat-room .message:last').fadeTo(0, 1);
		else
			$('#chat-room .message:last').fadeTo(300, 1);
		
		$('.message:odd').addClass('white');
		scrollToMessage('#chat-room');
	}
	
	return true;
}

function getOccupants() {
	var requestsCount, limit = 100, ids = Object.keys(namesOccupants);
	switches.isOccupantsDownloaded = true;
	
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
}

function getOneOccupant(id, time) {
	QB.users.get(parseInt(id), function(err, result) {
		if (err) {
			console.log(err.detail);
		} else {
			createUsersList(result);
			$('#chat-room .chat-content').append('<span class="service-message joined" data-time="' + time + '">' + result.full_name + ' has joined the chat.</span>');
			scrollToMessage('#chat-room');
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
	
	$('.loading_users').remove();
	$('#chat-room .users-list').append('<li class="list-item show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '">' + name + '</li>');
	namesOccupants[qbID] = name;
}

function showComposing(composing, qbID) {
	var name, obj = $('.typing');
	if (typeof(namesOccupants[qbID]) != "string") return false;
	
	name = namesOccupants[qbID];
	removeTypingMessage(obj, name);
	
	if (composing && qbID != chatUser.qbID) {
		if ($('.chat:visible span').is('.typing'))
			addTypingMessage(obj, name);
		else {
			$('.chat:visible .chat-content').append('<span class="typing">' + name + ' ...</span>');
			scrollToMessage('.chat:visible');
		}
	}
}

function showActionToolbar() {
	var html, qbID, fbID, name;
	
	qbID = $(this).data('qb');
	fbID = $(this).data('fb');
	name = $(this).find('.message-author').text() || $(this).text();
	
	html = '<div class="action-group">';
	if (qbID != chatUser.qbID && $('#chat-room').is(':visible')) {
		html += '<button class="btn btn_action btn_quote" data-name="' + name + '"><span>Reply</span></button>';
		html += '<button class="btn btn_action btn_private" data-qb="' + qbID + '" data-fb="' + fbID + '"><span>Private message</span></button>';
	}
	html += fbID ? '<a href="https://facebook.com/' + fbID + '" target="_blank" class="btn btn_action"><span>View profile</span></a>' : '';
	html += '</div><div class="action-group">';
	html += '<button class="btn btn_action btn_cancel"><span>Cancel</span></button>';
	html += '</div>';
	
	$('.actions').html(html);
}

function makeQuote() {
	var name, quote;
	
	name = $(this).data('name').replace(/ /g, "%20");
	quote = '@'.concat(name).concat(' ');
	$('.chat:visible .send-message').focus().val(quote);
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

function createPrivateChat() {
	var htmlChat, htmlChatsList, htmlUsersList, chatContentHeight;
	var qbID, fbID, name, chatsCount = 2, usersCount = 2;
	
	qbID = $(this).data('qb');
	fbID = $(this).data('fb');
	name = namesOccupants[qbID];
	
	htmlUsersList = '<li class="list-title">Users</li>';
	htmlUsersList += '<li class="list-item show-actions" data-qb="' + chatUser.qbID + '" data-fb="' + (chatUser.fbID || '') + '">' + chatUser.name + '</li>';
	htmlUsersList += '<li class="list-item show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '">' + name + '</li>';
	
	htmlChat = '<div id="chat-' + qbID + '" class="chat">';
	htmlChat += '<header class="chat-header">';
	htmlChat += '<a href="#" class="users show-list"><span class="users-count">' + usersCount + '</span></a>';
	htmlChat += '<a href="#" class="chats show-list"><span class="chats-count">' + chatsCount + '</span></a>';
	htmlChat += '<a href="#" class="logout"><img src="images/logout.png" alt="logout"></a>';
	htmlChat += '<h2 class="chat-name" title="' + name + '">' + name + '</h2>';
	htmlChat += '<ul class="users-list list hidden">' + htmlUsersList + '</ul></header>';
	htmlChat += '<section class="chat-content"></section>';
	htmlChat += '<footer class="chat-footer">';
	htmlChat += '<textarea class="send-message" placeholder="Enter Message" rows="1"></textarea>';
	htmlChat += '<a href="#" class="smiles show-list"><img src="images/smile.png" alt="smile"></a>';
	htmlChat += '</footer></div>';
	
	$('#chat-room').hide();
	$('.chat:last').after(htmlChat);
	
	chatContentHeight = $('#chat-room .chat-content').height();
	$('.chat:visible .chat-content').height(chatContentHeight);
}
