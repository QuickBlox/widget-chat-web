/*
 * QuickBlox Web XMPP Chat sample
 * version 1.2.2
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var storage, FB_active, login, password, full_name, email, params, qbToken, qbUser, avatarLink, connection, userJID, html, occupants;

function authQB() {
	$('#buttons').hide().next('#qb_login_form').show().find('input').val('');
}

function authFB() {
	FB.login();
  fbAPI();
}

function userCreate() {
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

function sessionCreate(storage, fb_token) {
	$('#auth').hide().next('#connecting').show();
	$('#wrap').addClass('connect_message');
	
	if (storage) {
		login = storage.login;
		password = storage.password;
	} else {
		login = $('#login').val();
		password = $('#password').val();
	}
	
	if (login.indexOf('@') > 0) {
		params = {email: login, password: password};
	} else {
		params = {login: login, password: password};
	}
	
	if (fb_token) {
		params = {provider: 'facebook', keys: {token: fb_token}};
	}
	
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	QB.createSession(function(err, result){
		if (err) {
			console.log('Something went wrong: ' + err.detail);
			connectFailed();
		} else {
			console.log(result);
			qbToken = result.token;
			
			QB.login(params, function(err, result){
				if (err) {
					console.log('Something went wrong: ' + err.detail);
					connectFailed();
				} else {
					console.log(result);
					
					xmppConnect(result.id, result.full_name, result.blob_id, login, password, result.facebook_id, qbToken);
				}
			});
		}
	});
}

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
				storage = {type: 0, login: login, password: password};
				localStorage['auth'] = $.base64.encode(JSON.stringify(storage));
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
	html += '<section>' + smilesParser(toHTML(linkURLs(message))) + '</section>';
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

function fbAPI() {
	if (!FB_active) {
		FB.Event.subscribe('auth.statusChange', function(response) {
			console.log('facebook authorization...');
			console.log(response.status);
			if (response.status === 'connected') {
				if ($('.message-wrap').length == 0) {
					var FB_accessToken = response.authResponse.accessToken;
					console.log('Welcome!  Fetching your information.... ');
					FB.api('/me', function(response) {
						console.log(response);
						console.log('Good to see you, ' + response.name + '.');
						sessionCreate(null, FB_accessToken);
					});
				}
			} else if (response.status === 'not_authorized') {
				FB.login();
			} else {
				FB.login();
			}
		});
	}
}

/*------------------- DOM is ready -------------------------*/
$(document).ready(function(){
	if (localStorage['auth']) {
		console.log('localStorage');
		storage = JSON.parse($.base64.decode(localStorage['auth']));
		sessionCreate(storage);
	} else {
		console.log("FB");
		fbAPI();
		FB_active = 1;
	}
	
	widgetView();
	signup();
	inputFile();
	occupants();
});

/*----------------- Helper functions -----------------------*/
function widgetView() {
	$('#chat .chat-content').css('height', WIDGET_HEIGHT - 95);
	$('#chat .chat-footer textarea').css('width', WIDGET_WIDTH - 100);
	$('#area').css('width', WIDGET_WIDTH - 86);
	$('.list').css('width', WIDGET_WIDTH/2 + 23).css('max-height', WIDGET_HEIGHT - 72);

	if (WIDGET_WIDTH > 600 && WIDGET_HEIGHT > 600) {
		$('#area').addClass('big-layout');
	}
	
	if (WIDGET_HEIGHT < 500) {
		$('#chat .chat-content').css('height', WIDGET_HEIGHT - 93);
	}
	
	if (WIDGET_WIDTH < 350 || WIDGET_HEIGHT < 350) {
		$('#chat .chat-content').css('height', WIDGET_HEIGHT - 79);
		$('#chat .chat-footer textarea').css('width', WIDGET_WIDTH - 90);
		$('#area').css('width', WIDGET_WIDTH - 76);
	}
}
function signUpFailed() {
	$('#qb_signup_form input').prop('disabled', false);
	$('#qb_signup_form button').removeClass('disabled');
}

function signUpSuccess() {
	$('.logo, .welcome').show();
	$('#qb_signup_form, .success_reg').hide().prev('#qb_login_form').show().find('input').val('').removeClass('error');
}

function connectFailed() {
	$('#connecting, #chat').hide().prev('#auth').show();
	$('#wrap').removeClass('connect_message');
	$('#qb_login_form input').addClass('error');
}

function connectSuccess(username) {
	$('#connecting').hide().next('#chat').show();
	$('#wrap').removeClass('connect_message').css('width', 'auto');
	$('input').removeClass('error');
	$('textarea').val('');
	$('.logout').attr('data-username', username);
	textareaUp();
	smiles();
}

function signup() {
	$('#signup').click(function(event){
		event.preventDefault();
		$('.logo, .welcome').hide();
		$('#qb_signup_form input').prop('disabled', false);
		$('#qb_login_form').hide().next('#qb_signup_form').show().find('input').val('').removeClass('error');
	});
}

function checkLogout() {
	if (localStorage['auth']) {
		localStorage.removeItem('auth');
	} else {
		FB.logout(function(response) {
			console.log("[FB Logout]");
			console.log(response);
		});
	}

	var nick = $('.logout').data('data-username');
	connection.muc.leave(CHAT.roomJID, nick);
	setTimeout(function() {connection.disconnect()}, 1000);
}

function trim(str) {
	if (str.charAt(0) == ' ')
		str = trim(str.substring(1, str.length));
	if (str.charAt(str.length-1) == ' ')
		str = trim(str.substring(0, str.length-1));
	return str;
}

function inputFile() {
	$('.fileUpload').hover(
		function () { $(this).find('img').addClass('hover'); },
		function () {	$(this).find('img').removeClass('hover'); }
	);
	
	$('.fileUpload input:file').change(function(){
		var file = $(this).val();
		$(this).next().val(file);
	});
}

function linkURLs(text) {
	var url_regexp = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
	
	var link = text.replace(url_regexp, function(match) {
		var url = (/^[a-z]+:/i).test(match) ? match : "http://" + match;
		var url_text = match;
		
		return "<a href=\""+escapeHTML(url)+"\" target=\"_blank\">"+escapeHTML(url_text)+"</a>";
	});
	
	return link;
}

function escapeHTML(s) {
	return s.replace(/</g,"&lt;").replace(/>/g,"^&gt;");
}

function textareaUp() {
	$('.message_field').click(function(){
		$('#area').show();
		$('#message_area').focus();
	});
	$(document).click(function(e){
		if ($(e.target).is('.message_field, #message_area, .controls, .controls *, .smiles-icons, .smiles-icons *')) {
			return;
		}
	  $('.message_field').val($('#message_area').val());
	  $("#area").hide();
	});
}

function toHTML(str) {
	return ('<p>' + str).replace(/\n\n/g, '<p>').replace(/\n/g, '<br>');
}

function smilesParser(text) {
	for(var i = SMILEICONS.length-1; i >= 0; i--) {
		text = text.replace(SMILEICONS[i].regex, '$2<img class="smileicons" alt="$1" src="images/smiles/' + SMILEICONS[i].image + '" />$3');
	}
	return text;
}

function smiles() {
	$('.smiles-icons').remove();
	$('#area').append('<div class="smiles-icons"></div>');
	for(var i = 0; i < SMILEICONS.length; i++) {
		$('.smiles-icons').append('<img class="smileicons" alt="icons" data-plain="' + SMILEICONS[i].plain + '" src="images/smiles/' + SMILEICONS[i].image + '" />');
	}
	
	$('.smiles').click(function(){
		$(this).css('background','#dadada');
		$(this).parents('#area').find('.smiles-icons').show();
	});
	$(document).click(function(e){
		if ($(e.target).is('.smiles *, .smiles-icons, .smiles-icons *')) {
			if ($(e.target).is('.smiles-icons *')) {
				$('#message_area').val($('#message_area').val() + ' ' + $(e.target).data('plain') + ' ');
			}
			return;
		}
	  $('.smiles-icons').hide();
	  $('.smiles').css('background','none');
	});
}
