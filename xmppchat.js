/*
 * QuickBlox Web XMPP Chat sample
 * version 1.0.0
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var storage, login, password, full_name, email, params, connection, userJID, html, occupants;

function authQB() {
	$('#buttons').hide().next('#qb_login_form').show().find('input').val('');
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
		$('#qb_signup_form').append('<img class="ajax-loader" src="images/ajax-loader.gif" alt="loader" />');
		
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
						signUpFailed();
						
						$('#qb_signup_form').hide().next('.success_reg').show();
						setTimeout(signUpSuccess, 5 * 1000);
					}
				});
			}
		});
	}
}

function sessionCreate(storage) {
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
	
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	QB.createSession(function(err, result){
		if (err) {
			console.log('Something went wrong: ' + err.detail);
			connectFailed();
		} else {
			console.log(result);
			
			QB.login(params, function(err, result){
				if (err) {
					console.log('Something went wrong: ' + err.detail);
					connectFailed();
				} else {
					console.log(result);

					xmppConnect(result.id, result.full_name, login, password);
				}
			});
		}
	});
}

function xmppConnect(user_id, user_full_name, login, password) {
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
		  connectSuccess();
			
			storage = {type: 0, login: login, password: password};
			localStorage['auth'] = $.base64.encode(JSON.stringify(storage));
			
			connection.muc.join(CHAT.roomJID, user_full_name, onMessage, onPresence, roster);
		  break;
		case Strophe.Status.DISCONNECTED:
		  console.log('[Connection] Disconnected');
		  break;
		case Strophe.Status.DISCONNECTING:
		  console.log('[Connection] Disconnecting');
		  
		  connection.muc.leave(CHAT.roomJID, user_full_name);
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
  
  var message = $(stanza).find('body').context.textContent;
  var time = $(stanza).find('delay').attr('stamp');
  var user = $(stanza).attr('from').split('/')[1].replace(/\\20/g, ' ');
  
  if (!time) {
  	time = new Date();
  } else {
  	time = new Date(time);
  }
  
	html = '<article class="message-wrap">';
	html += '<img class="avatar" src="images/default_avatar.gif" alt="avatar" />';
	html += '<div class="message">';
	html += '<header><h4>' + user + '</h4></header>';
	html += '<section>' + message + '</section>';
	html += '<footer class="time">' + $.formatDateTime('M dd, yy hh:ii:ss', time) + '</footer>';
	html += '</div></article>';
	
	$('.chat-content').append(html).find('.message-wrap:last').fadeTo(500, 1);
	$('.chat-content').scrollTo('.message-wrap:last', 0);

	return true;
}

function onPresence(stanza, room) {
	console.log('[XMPP] Presence');
  
  var infoLeave = $(stanza).attr('type');
  var user = $(stanza).find('item').attr('nick').replace(/\\20/g, ' ');
  var messageLength = $('.message-wrap').length;
  
  if ((messageLength != 0) && infoLeave && (user != 'admin')) {
  	$('.chat-content').append('<span class="leave">' + user + ' leave this chat..</span>');
  	$('.chat-content').scrollTo('.leave:last', 0);
  } else if ((messageLength != 0) && (user != 'admin')) {
  	$('.chat-content').append('<span class="joined">' + user + ' joined to chat..</span>');
  	$('.chat-content').scrollTo('.joined:last', 0);
  }
  
  return true;
}

function roster(users, room) {
	occupants = Object.keys(users).length;
	$('.occupants .number').text(occupants);
  
  return true;
}

function sendMesage() {
	var post = $('.message_field');
	if (!trim(post.val())) {
		post.addClass('error');
	} else {
		post.removeClass('error');
		connection.muc.groupchat(CHAT.roomJID, post.val());
		post.val('');
	}
}

/*------------------- DOM is ready -------------------------*/
$(document).ready(function(){
	if (localStorage['auth']) {
		storage = JSON.parse($.base64.decode(localStorage['auth']));
		sessionCreate(storage);
	}
	signup();
	inputFile();
});

/*----------------- Helper functions -----------------------*/
function signUpFailed() {
	$('.ajax-loader').remove();
	$('#qb_signup_form input').prop('disabled', false);
	$('#qb_signup_form button').removeClass('disabled');
}

function signUpSuccess() {
	$('.logo, .welcome').show();
	$('#qb_signup_form, .success_reg').hide().prev('#qb_login_form').show().find('input').val('').removeClass('error');
}

function connectFailed() {
	$('#connecting').hide().prev('#auth').show();
	$('#wrap').removeClass('connect_message');
	$('#qb_login_form input').addClass('error');
}

function connectSuccess() {
	$('#connecting').hide().next('#chat').show();
	$('#wrap').removeClass('connect_message');
	$('input').removeClass('error');
	checkLogout();
	
	var room_name = CHAT.roomJID.split('@')[0];
	var sym = room_name.indexOf('_') + 1;
	$('.room_name').text(room_name.slice(sym));
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
	$('.logout').click(function(event){
		event.preventDefault();
		connection.disconnect();
		localStorage.removeItem('auth');
	});
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
