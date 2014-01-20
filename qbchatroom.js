/**
 * QB Group Chat Room (XMPP)
 * version 2.0.0a
 * 
 * author: Andrey Povelichenko <andrey.povelichenko@quickblox.com>
 */

var storage, params, connection, userJID, html, occupants;
var isSubscribeEnabled = false;
var chatUser = {
	nick: null,
	avatar: null,
	qb: {
		id: null,
		login: null,
		email: null,
		blob_id: null,
		token: null
	},
	fb: {
		id: null,
		profile: null,
		access_token: null
	}
};

$(document).ready(function() {
	$.ajaxSetup({ cache: true });
	$.getScript('https://connect.facebook.net/en_EN/all.js', function() {
		FB.init({
			appId: FBAPP.app_id,
			cookie: true
		});
		QB.init(QBAPP.app_id, QBAPP.auth_key, QBAPP.auth_secret);
		
		autoLogin();
		changeInputFileBehavior();
		
		$('#authFB').click(function(){ authFB() });
		$('#authQB').click(function(){ authQB() });
		$('#signUp').click(function(){ signUp(); return false; });
		$('#dataLogin').click(function(){ prepareDataForLogin(); return false; });
		$('#dataSignup').click(function(){ prepareDataForSignUp(); return false; });
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
		chatUser.fb.profile = response.link;
		chatUser.fb.access_token = accessToken;
		
		chatUser.nick = response.name;
		chatUser.avatar = FBAPP.graph_server + '/' + response.id + '/picture/';
		
		createSession();
	});
}

function authFB() {
	FB.getLoginStatus(function(response) {
		console.log('FB ' + response.status);
		switch (response.status) {
		case 'connected':
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
			getQBUser(result.user_id);
		}
	});
}

function getQBUser(user_id) {
	QB.users.get({id: user_id}, function(err, result) {
		if (err) {
			console.log(err.detail);
			connectFailure();
		} else {
			chatUser.qb.id = result.id;
			chatUser.qb.login = result.login;
			chatUser.qb.email = result.email;
			chatUser.qb.blob_id = result.blob_id;
			
			if (!chatUser.nick)
				chatUser.nick = result.full_name;
			
			console.log(chatUser);
			connectSuccess();
			//xmppConnect(result.id, result.full_name, result.blob_id, login, password, result.facebook_id, qbToken);
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
	if ($('#signup-form input:first').is(':disabled'))
		return false;
	else
		$('#signup-form input').removeClass('error');

	// check if the user left empty fields
	$([$('#signup_name'), $('#signup_email'), $('#signup_login'), $('#signup_pass')]).each(function() {
		if (!trim(this.val()))
			this.addClass('error');
	});
	
	if ($('#signup-form input').is('.error'))
		return false;
	else
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
function xmppConnect(user_id, user_full_name, blob_id, login, password, facebook_id, qbToken) {
	if (blob_id == null) {
		avatarLink = blob_id;
		if (facebook_id) {
			avatarLink = 'https://graph.facebook.com/' + facebook_id + '/picture/';
			password = qbToken;
		}
	} else {
		params = {login: login, password: password};
		
		QB.createSession(params, function(err, result){
			if (err) {
				console.log('Something went wrong: ' + err.detail);
			} else {
				console.log(result);
				
				QB.content.getBlobObjectById(blob_id, function(err, res){
					if (err) {
						console.log('Something went wrong: ' + err);
					} else {
						console.log(res);
						
						avatarLink = res.blob_object_access.params;
					}
				});
			}
		});
	}
	
	connection = new Strophe.Connection(CHAT.bosh_url);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	console.log(connection);
	
	userJID = user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server;
	
	connection.connect(userJID, password, function (status) {
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
		  connectSuccess(user_full_name);
			
			if (facebook_id == null) {
				qbAuth = {type: 0, login: login, password: password};
				localStorage['qbAuth'] = $.base64.encode(JSON.stringify(qbAuth));
			}
			
			connection.muc.join(CHAT.roomJID, user_full_name, onMessage, onPresence, roster);
		  break;
		case Strophe.Status.DISCONNECTED:
		  console.log('[Connection] Disconnected');
		  break;
		case Strophe.Status.DISCONNECTING:
		  console.log('[Connection] Disconnecting');
		  
		  $('.chat-content').html('');
			$('#chat, #qb_login_form').hide().prevAll('#auth, #buttons').show();
		  break;
		case Strophe.Status.ATTACHED:
		  console.log('[Connection] Attached');
		  break;
		}
	});
}

function rawInput(data) {
  console.log('RECV: ' + data);
}

function rawOutput(data) {
  console.log('SENT: ' + data);
}

function onMessage(stanza, room) {
	console.log('[XMPP] Message');
  
  try {
  	var response = JSON.parse(Strophe.unescapeNode($(stanza).find('body').context.textContent));
	}	catch (err) {
  	var response = Strophe.unescapeNode($(stanza).find('body').context.textContent);
	}

  if (response.message) {var message = response.message;}
  else {var message = response;}

  if (response.avatar) {var avatar = response.avatar;}
  else {var avatar = null;}

  if (avatar == null) {
  	avatar = 'images/default_avatar.gif';
  }
  var time = $(stanza).find('delay').attr('stamp');
  var user = Strophe.unescapeNode($(stanza).attr('from').split('/')[1]);
  
  if (!time) {
  	time = new Date();
  } else {
  	time = new Date(time);
  }
  
	html = '<article class="message-wrap">';
	html += '<img class="avatar" src="' + avatar + '" alt="avatar" />';
	html += '<div class="message">';
	html += '<header><h4>' + user + '</h4></header>';
	html += '<section>' + smilesParser(toHTML(linkURLs(escapeHTML(message)))) + '</section>';
	html += '<footer class="time">' + $.formatDateTime('M dd, yy hh:ii:ss', time) + '</footer>';
	html += '</div></article>';
	
	$('.chat-content').append(html).find('.message-wrap:last').fadeTo(500, 1);
	$('.chat-content').scrollTo('.message-wrap:last', 0);

	return true;
}

function onPresence(stanza, room) {
	console.log('[XMPP] Presence');
  
  var infoLeave = $(stanza).attr('type');
  var user = Strophe.unescapeNode($(stanza).find('item').attr('nick'));
  var messageLength = $('.message-wrap').length;
  
  if ((messageLength != 0) && infoLeave && (user != 'admin')) {
  	$('.chat-content').append('<span class="leave">' + user + ' leave this chat.</span>');
  	$('.chat-content').scrollTo('.leave:last', 0);
  } else if ((messageLength != 0) && (user != 'admin')) {
  	$('.chat-content').append('<span class="joined">' + user + ' has joined the room.</span>');
  	$('.chat-content').scrollTo('.joined:last', 0);
  }
  
  return true;
}

function roster(users, room) {
	occupants = Object.keys(users).length;
	$('.occupants .number').text(occupants);
	
	$('.occupants .list').html('<li class="title">Occupants</li>');
	$(Object.keys(users)).each(function(i){
		var key = Object.keys(users)[i];
	  var user = Strophe.unescapeNode(users[key].nick);
	  $('.occupants .list').append('<li>' + user + '</li>');
	});
  
  return true;
}

function occupants() {
	$('.occupants').click(function(){
		$(this).css('background','#dadada');
		$(this).find('.list').show();
	});
	$(document).click(function(e){
		if ($(e.target).is('.occupants, .occupants *')) {
			return;
		}
	  $('.occupants .list').hide();
	  $('.occupants').css('background','none');
	});
}

function sendMesage() {
	var post = $('#message_area');
	if (!trim(post.val())) {
		$('.message_field').addClass('error');
	} else {
		$('.message_field').removeClass('error');
		var message = {message: post.val(), avatar: avatarLink};
		connection.muc.groupchat(CHAT.roomJID, Strophe.escapeNode(JSON.stringify(message)));
		post.val('');
		$('.message_field').val('');
	}
}
