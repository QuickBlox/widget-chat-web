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
	$('#login-fom').show().find('input').val('');
}

/*---------------- QB Module -------------------*/
function formData() {
	storage = {
		login: $('#login').val(),
		pass: $('#pass').val()
	};
	
	// check if the user left empty fields
	if (trim(storage.login) && trim(storage.pass))
		sessionCreate(storage);
	else
		sessionFailed();
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
			sessionFailed();
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
			sessionFailed();
		} else {
			USER.qb.id = result.id;
			USER.qb.login = result.login;
			USER.qb.email = result.email;
			USER.qb.blob_id = result.blob_id;
			
			if (!USER.nick)
				USER.nick = result.full_name;
			
			console.log(USER);
			//xmppConnect(result.id, result.full_name, result.blob_id, login, password, result.facebook_id, qbToken);
		}
	});
}

function userCreate() {
	inputFileBehavior();
	
	if ($('#qb_signup_form button').is('.disabled')) {
		return false;
	}
	
	var tmp = true;
	$('#qb_signup_form input').removeClass('error');
	
	full_name = $('#full_name_signup');
	email = $('#email_signup');
	login = $('#login_signup');
	password = $('#password_signup');
	
	$([full_name, email, login, password]).each(function() {
		if (!trim(this.val())) {
			this.addClass('error');
			tmp = false;
		}
	});
	
	if (tmp) {
		params = {full_name: full_name.val(), email: email.val(), login: login.val(), password: password.val()};
		
		$('#qb_signup_form input').prop('disabled', true);
		$('#qb_signup_form button').addClass('disabled');
		
		QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
		QB.createSession(function(err, result){
			if (err) {
				console.log('Something went wrong: ' + err.detail);
				$('#qb_signup_form input').addClass('error');
				signUpFailed();
			} else {
				console.log(result);

				QB.users.create(params, function(err, result){
					if (err) {
						console.log('Something went wrong: ' + err.detail);
						$('#' + Object.keys(JSON.parse(err.detail).errors)[0] + '_signup').addClass('error');
						signUpFailed();
					} else {
						console.log(result);
						qbUser = result;
						
						var file = $('#qb_signup_form #avatar_signup')[0].files[0];
					  if (file) {
					  	params = {login: login.val(), password: password.val()};
					  	
					  	QB.createSession(params, function(err, result){
								if (err) {
									console.log('Something went wrong: ' + err.detail);
								} else {
									console.log(result);
				
									QB.content.create({name: file.name, content_type: file.type, 'public': true}, function(err, result){
								    if (err) {
								    	console.log('Error creating blob: ' + JSON.stringify(err));
								    	signUpFailed();
								    } else {
								      console.log(result);
								      
								      var uri = parseUri(result.blob_object_access.params);
								      var params_upload = { url: uri.protocol + '://' + uri.host };
								      var data = new FormData();
								      data.append('key', uri.queryKey.key);
								      data.append('acl', uri.queryKey.acl);
								      data.append('success_action_status', uri.queryKey.success_action_status);
								      data.append('AWSAccessKeyId', uri.queryKey.AWSAccessKeyId);
								      data.append('Policy', decodeURIComponent(uri.queryKey.Policy));
								      data.append('Signature', decodeURIComponent(uri.queryKey.Signature));
								      data.append('Content-Type', uri.queryKey['Content-Type']);
								      data.append('file', file, result.name);
								      params_upload.data = data;
								      QB.content.upload(params_upload, function(err, res){
								        if (err) {
								          console.log('Error uploading content' + err);
								        } else {
								          console.log(res);
								          
								          QB.content.markUploaded({id: result.id, size: file.size}, function(res){
										        console.log(res);
										        
										        QB.users.update({id: qbUser.id, data: {blob_id: result.id}}, function(err, res){
										        	if (err) {
											         	console.log('Something went wrong: ' + err);
											       	} else {
											         	console.log(res);
											         	
										          	signUpFailed();
														  	$('#qb_signup_form').hide().next('.success_reg').show();
																setTimeout(signUpSuccess, 5 * 1000);
											        }
											      });
										      });
								        }
								      });
								    }
								  });
								}
							});
					  } else {
					  	signUpFailed();
					  	$('#qb_signup_form').hide().next('.success_reg').show();
							setTimeout(signUpSuccess, 5 * 1000);
					  }
					}
				});
			}
		});
	}
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
