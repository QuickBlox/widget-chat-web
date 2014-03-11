/**
 * QB Group Chat Room (XMPP)
 * version 2.3.0
 * 
 * author: Andrey Povelichenko <andrey.povelichenko@quickblox.com>
 */

var params, connection, chatUser = {}, namesOccupants = {}, popups = {};
var signaling, videoChat;

var switches = {
	isComposing: {},
	isLogout: false,
	isPopupClosed: true,
	isFBconnected: false,
	isOccupantsDownloaded: false
};

var audio = {
	signal: $('#signal')[0],
	ring: $('#ring')[0]
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
		
		$('#authFB').click(authFB);
		$('#authQB').click(authQB);
		$('#signUp').click(signUp);
		$('#dataLogin').click(prepareDataForLogin);
		$('#dataSignup').click(prepareDataForSignUp);
		$('.smiles-list img').click(choseSmile);
		
		$('#chats-wrap').on('click', '.logout', logout);
		$('#chats-wrap').on('keydown', '.send-message', sendMesage);
		$('#chats-wrap').on('click', '.show-actions', showActionToolbar);
		$('#chats-wrap').on('click', '.users', {list: '.users-list'}, showList);
		$('#chats-wrap').on('click', '.chats', {list: '.chats-list'}, showList);
		$('#chats-wrap').on('click', '.smiles', {list: '.smiles-list'}, showList);
		$('.chats-list').on('click', '.switch-chat', switchСhat);
		$('.chats-list').on('mouseenter', '.switch-chat', addRemoveButton);
		$('.chats-list').on('mouseleave', '.switch-chat', deleteRemoveButton);
		$('.chats-list').on('click', '.remove', removeChat);
		$('.actions-wrap').on('click', '.btn_quote', makeQuote);
		$('.actions-wrap').on('click', '.btn_private', createPrivateChat);
		$('.actions-wrap').on('click', '.btn_videocall', createVideoChatInstance);
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
				chatUser.avatar = chatUser.fbID ? 'https://graph.facebook.com/' + chatUser.fbID + '/picture?width=150&height=150' : null;
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
	var userJID = getJID(chatUser.qbID);
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
			
			localStorage['QBChatUser'] = JSON.stringify(chatUser);
			connectSuccess();
			
			connection.addHandler(getMessage, null, 'message', 'chat', null, null);
			connection.muc.join(CHAT.roomJID, chatUser.qbID, getMessage, getPresence, getRoster);
			createSignalingInstance();
			
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

function sendMesage(event) {
	var message, post, userJID, qbID = getIDFromChat();
	if (!$('.chat:visible').is('#chat-room'))
		userJID = getJID(qbID);
	
	if (!switches.isComposing[qbID])
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
			
			if (userJID) {
				params = {
					to: userJID,
					from: connection.jid,
					type: 'chat'
				};
				connection.send($msg(params).c('body').t(message));
				
				showMessage(qbID,
				            post,
				            chatUser.name,
				            chatUser.avatar || 'images/avatar_default.jpg',
				            chatUser.fbID || '',
				            null,
				            null,
				            new Date().toISOString(),
				            $('.chat:visible'));
			}
			else
				connection.muc.groupchat(CHAT.roomJID, message);
			
			$(this).val('');
		}
		
		return false;
	}
	
	function sendComposing() {
		switches.isComposing[qbID] = true;
		checkTypeChatState(userJID, 'sendComposing');
		setTimeout(sendPaused, 5 * 1000);
	}
	
	function sendPaused() {
		if (!switches.isComposing[qbID]) return false;
		delete switches.isComposing[qbID];
		checkTypeChatState(userJID, 'sendPaused');
	}
}

function logout(event) {
	event.preventDefault();
	switches.isLogout = true;
	disconnectChat(chatUser.qbID);
	
	popups = {};
	chatUser = {};
	namesOccupants = {};
	signaling = null;
	videoChat = null;
	switches.isPopupClosed = true;
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
	var selector;
	
	user = $(stanza).attr('from');
	type = $(stanza).attr('type');
	time = new Date().toISOString();
	qbID = getIDFromResource(user);
	
	if (type) {
		if (typeof(namesOccupants[qbID]) == "string") {
			name = namesOccupants[qbID];
			selector = choseSelector(qbID);
			removeTypingMessage(obj, name);
			
			editUsersCount(selector, 1);
			$('.list-item[data-qb=' + qbID + ']').remove();
			selector.append('<span class="service-message left" data-time="' + time + '">' + name + ' has left this chat.</span>');
			scrollToMessage(selector);
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
	var type, author, response, createTime, messageTime, composing, paused;
	var qbID, message, name, avatar, fbID, icon, defaultAvatar = 'images/avatar_default.jpg';
	var chatID, selector;
	
	if (!switches.isOccupantsDownloaded && $('#chat-room .message').length > 1)
		getOccupants();
	
	author = $(stanza).attr('from');
	response = $(stanza).find('body')[0] && $(stanza).find('body')[0].textContent;
	createTime = $(stanza).find('delay').attr('stamp');
	
	composing = $(stanza).find('composing')[0];
	paused = $(stanza).find('paused')[0];
	
	type = $(stanza).attr('type');
	
	// fix private chat
	if (type == 'chat')
		qbID = getIDFromNode(author);
	else
		qbID = getIDFromResource(author);
	
	if (!response && composing || paused) {
		showComposing(composing, qbID, type);
	} else {
		console.log('[XMPP] Message');
		if (type == 'groupchat')
			$('.loading_messages').remove();
		
		response = checkResponse(response);
		messageTime = createTime || new Date().toISOString();
		
		message = response.message || response;
		name = response.name || qbID;
		avatar = response.avatar || defaultAvatar;
		fbID = response.fb || '';
		//icon = response.fb ? 'images/fb_auth.png' : 'images/qb_auth.png';
		
		chatID = (type == 'chat') ? '#chat-' + qbID : '#chat-room';
		if (type == 'chat' && !$('.chat').is(chatID))
			htmlChatBuilder(qbID, fbID, name, chatID, false);
		
		selector = $(chatID);
		editMessagesCount(chatID.substring(1), createTime);
		showMessage(qbID, message, name, avatar, fbID, icon, createTime, messageTime, selector);
	}
	
	return true;
}

function showMessage(qbID, message, name, avatar, fbID, icon, createTime, messageTime, selector) {
	var html;
	
	html = '<section class="message show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '">';
	//html += '<img class="message-icon" src="' + icon + '" alt="icon">';
	html += '<img class="message-avatar" src="' + avatar + '" alt="avatar">';
	html += '<div class="message-body">';
	html += '<div class="message-description">' + parser(message, createTime) + '</div>';
	html += '<footer><span class="message-author">' + name + '</span>';
	html += '<time class="message-time" datetime="' + messageTime + '">' + $.timeago(messageTime) + '</time></footer>';
	html += '</div></section>';
	
	if (selector.find('span').is('.typing'))
		selector.find('.typing').before(html);
	else if (selector.find('.service-message:last').data('time') > messageTime)
		selector.find('.service-message:first').before(html);		
	else
		selector.find('.chat-content').append(html);
	
	if (createTime)
		selector.find('.message:last').fadeTo(0, 1);
	else
		selector.find('.message:last').fadeTo(300, 1);
	
	selector.find('.message:odd').addClass('white');
	selector = selector.find('.chat-content');
	scrollToMessage(selector);
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
	var selector;
	
	QB.users.get(parseInt(id), function(err, result) {
		if (err) {
			console.log(err.detail);
		} else {
			createUsersList(result);
			selector = choseSelector(id);
			editUsersCount(selector, 2);
			selector.append('<span class="service-message joined" data-time="' + time + '">' + result.full_name + ' has joined the chat.</span>');
			scrollToMessage(selector);
		}
	});
}

/* Additional Features
-------------------------------------------------------------------------*/
function createUsersList(user) {
	var qbID, fbID, name;
	var selector;
	
	qbID = String(user.id);
	fbID = user.facebook_id || '';
	name = user.full_name;
	//var iconClass = user.facebook_id ? 'user_fb_icon' : 'user_qb_icon';
	
	$('.loading_users').remove();
	selector = choseSelector(qbID).parent().find('.users-list');
	selector.append('<li class="list-item show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '">' + name + '</li>');
	namesOccupants[qbID] = name;
}

function showComposing(composing, qbID, type) {
	var selector, name, obj;
	if (typeof(namesOccupants[qbID]) != "string") return false;
	
	selector = (type == 'chat') ? $('#chat-' + qbID) : $('#chat-room');
	name = namesOccupants[qbID];
	obj = selector.find('.typing');
	removeTypingMessage(obj, name);
	
	if (composing && qbID != chatUser.qbID) {
		if (selector.find('span').is('.typing'))
			addTypingMessage(obj, name);
		else {
			selector.find('.chat-content').append('<span class="typing">' + name + ' ...</span>');
			scrollToMessage(selector.find('.chat-content'));
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
		html += '<button class="btn btn_action btn_private" data-qb="' + qbID + '" data-fb="' + fbID + '" data-name="' + name + '"><span>Private message</span></button>';
	}
	if (qbID != chatUser.qbID)
		html += '<button class="btn btn_action btn_videocall" data-qb="' + qbID + '"><span>Video call</span></button>';
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
	var quote;
	
	quote = str.split(' ')[0].charAt(0) == '@' && str.split(' ')[0];
	
	if (quote) {
		if (escapeSpace(quote.split('@')[1]) == chatUser.name && !time)
			audio.signal.play();
		return str.replace(quote, '<b>' + escapeSpace(quote) + '</b>');
	} else {
		return str;
	}
	
	function escapeSpace(s) {
		return s.replace("%20", ' ');
	}
}

function createPrivateChat() {
	var qbID, fbID, name;
	var chatID, selector;
	
	qbID = $(this).data('qb');
	fbID = $(this).data('fb');
	name = $(this).data('name');
	
	chatID = '#chat-' + qbID;
	selector = $(chatID).find('.chat-content');
	
	if ($('.chat').is(chatID)) {
		$('.chat:visible').hide();
		$(chatID).show();
		scrollToMessage(selector);
		deleteMessageCount(chatID.substring(1));
	} else {
		htmlChatBuilder(qbID, fbID, name, chatID, true);
	}
}

function htmlChatBuilder(qbID, fbID, name, chatID, isOwner) {
	var obj, htmlUsersList, chatsCount, usersCount = 1;
	
	$('.chats-list').append('<li class="list-item switch-chat" data-id="chat-' + qbID + '">' + name + ' <span class="messages-count"></span></li>')
	chatsCount = $('.chats-list .list-item').length;
	htmlUsersList = '<li class="list-item show-actions" data-qb="' + chatUser.qbID + '" data-fb="' + (chatUser.fbID || '') + '">' + chatUser.name + '</li>';
	if (typeof(namesOccupants[qbID]) == "string") {
		htmlUsersList += '<li class="list-item show-actions" data-qb="' + qbID + '" data-fb="' + fbID + '">' + name + '</li>';
		usersCount = 2;
	}
	
	$('.chats').show();
	$('.chats-count').text(chatsCount);
	
	if (isOwner) {
		$('#chat-room').hide().clone().show().insertAfter('.chat:last');
		obj = $('.chat:visible');
	} else {
		$('#chat-room').clone().hide().insertAfter('.chat:last');
		obj = $('.chat:last');
		audio.signal.play();
	}
	
	obj.attr('id', chatID.substring(1));
	obj.find('.users-count').text(usersCount);
	obj.find('.chat-name').attr('title', name).text(name);
	obj.find('.users-list .list-title').nextAll().remove().end().after(htmlUsersList);
	obj.find('.chat-content').empty();
}

/* Video Chat Module
-------------------------------------------------------------------------*/
function createSignalingInstance() {
	signaling = new QBVideoChatSignaling(QBAPP.appID, CHAT.server, connection);
	signaling.onCallCallback = onCall;
	signaling.onAcceptCallback = onAccept;
	signaling.onRejectCallback = onReject;
	signaling.onStopCallback = onStop;
}

function createVideoChatInstance(event, userID, sessionID, sessionDescription) {
	var qbID, name;
	
	qbID = userID || $(this).data('qb');
	name = namesOccupants[qbID];
	
	if (!name) {
		alert('Sorry, this user is offline');
		return true;
	} else if (popups['videochat']) {
		popups['videochat'].close();
		delete popups['videochat'];
	}
	
	videoChat = new QBVideoChat({audio: true, video: true}, ICE_SERVERS, signaling, sessionID, sessionDescription);
	videoChat.onGetUserMediaSuccess = function() { getMediaSuccess(qbID, name, sessionID) };
	videoChat.onGetUserMediaError = function() { getMediaError(qbID) };
	videoChat.getUserMedia();
}

function getMediaSuccess(qbID, name, sessionID) {
	var win, selector, winName = 'videochat' + chatUser.qbID + '_' + qbID;
	
	popups['videochat'] = openPopup(winName, null, 'resizable=yes');
	win = popups['videochat'];
	
	win.onload = function() {
		selector = $(win.document);
		selector.find('#doCall').click(doCall);
		selector.find('#stopCall').click(stopCall);
		
		htmlVideoChatBuilder(selector, qbID, name, sessionID);
		
		videoChat.localStreamElement = selector.find('#localVideo')[0];
		videoChat.remoteStreamElement = selector.find('#remoteVideo')[0];
		videoChat.attachMediaStream(videoChat.localStreamElement, videoChat.localStream);
		
		if (sessionID) {
			getRemoteStream(selector);
			videoChat.accept(qbID);
		}
		
		win.onresize = function() {
			resize(win, this.innerWidth, this.innerHeight);
		};
		
		win.onbeforeunload = function() {
			if (switches.isPopupClosed)
				stopCall();
			switches.isPopupClosed = true;
		};
	};
}

function getMediaError(qbID) {
	videoChat.reject(qbID);
}

// methods
function doCall() {
	var qbID = $(this).data('qb');
	$(this).hide().parent().find('#stopCall').show();
	videoChat.call(qbID, chatUser.avatar);
}

function acceptCall() {
	var qbID, sessionDescription, sessionID;
	
	qbID = $(this).data('qb');
	sessionID = $(this).data('id');
	sessionDescription = $(this).data('description');
	
	switches.isPopupClosed = false;
	popups['remoteCall' + qbID].close();
	delete popups['remoteCall' + qbID];
	
	stopRing(popups);
	createVideoChatInstance(null, qbID, sessionID, sessionDescription);
}

function rejectCall(qbID, sessionID) {
	switches.isPopupClosed = false;
	popups['remoteCall' + qbID].close();
	delete popups['remoteCall' + qbID];
	
	stopRing(popups);
	videoChat = videoChat || new QBVideoChat(null, ICE_SERVERS, signaling, sessionID, null);
	videoChat.reject(qbID);
}

function stopCall() {
	var win, qbID;
	
	win = popups['videochat'];
	qbID = $(win.document).find('#stopCall').data('qb');
	
	switches.isPopupClosed = false;
	win.close();
	delete popups['videochat'];
	
	videoChat.stop(qbID);
	videoChat.hangup();
	videoChat = null;
}

// callbacks
function onCall(qbID, sessionDescription, sessionID, avatar) {
	var win, selector, winName = 'remoteCall' + qbID;
	var name = namesOccupants[qbID];
	
	if (popups[winName]) {
		popups[winName].close();
		delete popups[winName];
	}
	
	popups[winName] = openPopup(winName, {width: 250, height: 280});
	win = popups[winName];
	
	win.onload = function() {
		selector = $(win.document);
		selector.find('#acceptCall').click(acceptCall);
		selector.find('#rejectCall').click(function() {rejectCall(qbID, sessionID)});
		
		htmlRemoteCallBuilder(selector, qbID, sessionDescription, sessionID, avatar, name);
		audio.ring.play();
		
		win.onbeforeunload = function() {
			if (switches.isPopupClosed)
				rejectCall(qbID, sessionID);
			switches.isPopupClosed = true;
		};
	};
}

function onAccept(qbID) {
	var win = popups['videochat'];
	getRemoteStream($(win.document));
}

function onReject(qbID) {
	var win = popups['videochat'];
	if (win)
		$(win.document).find('#stopCall').hide().parent().find('#doCall').show();
}

function onStop(qbID) {
	var win;
	
	win = popups['videochat'];
	if (win && qbID == $(win.document).find('#stopCall').data('qb')) {
		switches.isPopupClosed = false;
		win.close();
		delete popups['videochat'];
		
		videoChat.hangup();
		videoChat = null;
	}
	
	win = popups['remoteCall' + qbID];
	if (win) {
		switches.isPopupClosed = false;
		win.close();
		delete popups['remoteCall' + qbID];
		
		stopRing(popups);
	}
}
