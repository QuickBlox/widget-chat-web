/*
 * QB Group Chat Room (XMPP)
 * version 2.0.0a
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var storage, params, connection, userJID, html, occupants;

/*
 * Switch parameter
 * If the user has already subscribed on FB Event 'auth.statusChange'
 * and no need to do this anymore
 */
var enableSubscribe = false;

/*
 * Object structure of chat user
 */
var USER = {
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

/*------------------- DOM is ready -------------------------*/
$(document).ready(function(){
	$.ajaxSetup({ cache: true });
	$.getScript('https://connect.facebook.net/en_EN/all.js', function(){
		FB.init({
			appId: FBPARAMS.app_id,
			cookie: true
		});
		
		autoLogin();
		inputFileBehavior();
	});
});

/*---------------- Authorization Module -------------------*/
/*
* To check if the user has already logged previously
*/
function autoLogin() {
	if (localStorage['qbAuth']) {
		// Autologin as QB user
		console.log('QuickBlox login is chosen');
		storage = $.parseJSON(localStorage['qbAuth']);
		sessionCreate(storage);
	} else {
		// Autologin as FB user
		subscribeFBStatusEvent();
		enableSubscribe = true;
	}
}

function subscribeFBStatusEvent() {
	if (!enableSubscribe) {
		FB.Event.subscribe('auth.statusChange', function(response) {
			console.log('Facebook login is chosen');
			console.log('FB ' + response.status);
			if (response.status == 'connected')
				getFBUser(response.authResponse.accessToken);
		});
	}
}

function getFBUser(accessToken) {
	FB.api('/me', function(response) {
		USER.fb.id = response.id;
		USER.fb.profile = response.link;
		USER.fb.access_token = accessToken;
		
		USER.nick = response.name;
		USER.avatar = FBPARAMS.graph_server + '/' + response.id + '/picture/';
		
		sessionCreate();
	});
}

function authFB() {
	console.log('Facebook login is chosen');
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
	enableSubscribe = true;
}

function authQB() {
	console.log('QuickBlox login is chosen');
	$('.bubbles').addClass('bubbles_login');
	$('.header').addClass('header_login');
	$('#auth').hide();
	$('#login-fom').show();
	$('#login-fom input').val('').removeClass('error');
}

/*---------------- QB Module (find the user) -------------------*/
/*
* This function needs to prepare form data and to check them on the void
*/
function formDataLogin() {
	storage = {
		login: $('#login').val(),
		pass: $('#pass').val()
	};
	
	// check if the user left empty fields
	if (trim(storage.login) && trim(storage.pass))
		sessionCreate(storage);
	else
		connectFailed();
}

function sessionCreate(storage) {
	$('#main').hide();
	$('#connecting').show();
	
	/*
	* Formatted request parameters
	*/
	if (USER.fb.access_token) {
		// via Facebook
		params = {provider: 'facebook', keys: {token: USER.fb.access_token}};
	} else if (storage.login.indexOf('@') > 0) {
		// via QB email and password
		params = {email: storage.login, password: storage.pass};
	} else {
		// via QB login and password
		params = {login: storage.login, password: storage.pass};
	}
	
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	QB.createSession(params, function(err, result) {
		if (err) {
			console.log(err.detail);
			connectFailed();
		} else {
			USER.qb.token = result.token;
			getQBUser(result.user_id);
		}
	});
}

function getQBUser(user_id) {
	QB.users.get({id: user_id}, function(err, result) {
		if (err) {
			console.log(err.detail);
			connectFailed();
		} else {
			USER.qb.id = result.id;
			USER.qb.login = result.login;
			USER.qb.email = result.email;
			USER.qb.blob_id = result.blob_id;
			
			if (!USER.nick)
				USER.nick = result.full_name;
			
			console.log(USER);
			connectSuccess();
			//xmppConnect(result.id, result.full_name, result.blob_id, login, password, result.facebook_id, qbToken);
		}
	});
}

/*---------------- QB Module (create the user) -------------------*/
function signUp() {
	$('#main').hide();
	$('#signup-form').show();
	$('#signup-form input').val('').removeClass('error').prop('disabled', false);
}

/*
* This function needs to prepare form data and to check them on the void
*/
function formDataSignUp() {
	// check if form is disabled
	if ($('#signup-form input:first').is(':disabled'))
		return false;
	else
		$('#signup-form input').removeClass('error');
	
	storage = {
		name: $('#signup_name'),
		email: $('#signup_email'),
		login: $('#signup_login'),
		pass: $('#signup_pass')
	};
	
	// check if the user left empty fields
	$(Object.keys(storage)).each(function() {
		var obj = $(storage[this][0]);
		if (!trim(obj.val()))
			obj.addClass('error');
	});
	if ($('#signup-form input').is('.error'))
		return false;
	else
		$('#signup-form input').prop('disabled', true);
	
	// create the QB session
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	QB.createSession(function(err, result) {
		if (err) {
			console.log(err.detail);
			signUpFailed();
		} else {
			userCreate(storage);
		}
	});
}

function userCreate(storage) {
	var file = $('#signup_avatar')[0].files[0];
	params = {
		full_name: storage.name.val(),
		email: storage.email.val(),
		login: storage.login.val(),
		password: storage.pass.val()
	};
	
	QB.users.create(params, function(err, result){
		if (err) {
			console.log(err.detail);
			signUpFailed();
		} else if (file) {
		  blobCreate(file);
		} else {
			signUpSuccess();
		}
	});
}

function blobCreate(file) {
	var user_id;
	params = {
		login: params.login,
		password: params.password
	};
	
	QB.login(params, function(err, result){
		if (err) {
			console.log(err.detail);
			signUpFailed();
		} else {
			user_id = result.id;
			
			QB.content.createAndUpload({file: file, public: true}, function(err, result){
			  if (err) {
			   	console.log(err.detail);
					signUpFailed();
			  } else {
			    
					QB.users.update({id: user_id, blob_id: result.id}, function(err, result){
					 	if (err) {
					   	console.log(err.detail);
							signUpFailed();
					 	} else {
					   	signUpSuccess();
						}
				  });
				}
			});
		}
	});
}

/*---------------- Chat Module -------------------*/
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
		  connectFailed();
		  break;
		case Strophe.Status.AUTHENTICATING:
		  console.log('[Connection] Authenticating');
		  break;
		case Strophe.Status.AUTHFAIL:
		  console.log('[Connection] Unauthorized');
		  connectFailed();
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
