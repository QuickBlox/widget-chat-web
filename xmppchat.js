/*
 * QuickBlox Web XMPP Chat sample
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var storage, login, password, params, connection, userJID, roomJID, nick, html;

function authQB() {
	$('#buttons').hide().next('#qb_login_form').show().find('input').val('');
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
					
					nick = result.full_name;
					xmppConnect(result.id, nick, login, password);
				}
			});
		}
	});
}

function xmppConnect(user_id, nick, login, password) {
	connection = new Strophe.Connection(CHAT.bosh_url);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	console.log(connection);
	
	userJID = user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server;
	roomJID = QBPARAMS.app_id + "_" + CHAT.room_name + "@" + CHAT.muc_server;
	
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
			
			connection.muc.join(roomJID, nick, onMessage);
		  break;
		case Strophe.Status.DISCONNECTED:
		  console.log('[Connection] Disconnected');
		  break;
		case Strophe.Status.DISCONNECTING:
		  console.log('[Connection] Disconnecting');
		  
		  connection.muc.leave(roomJID, nick);
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
	
	$('.chat-content').append(html);
	$('.chat-content').scrollTo('.message-wrap:last', 0);

	return true;
}

function sendMesage() {
	connection.muc.groupchat(roomJID, $('#message').val());
}

/*------------------- DOM is ready -------------------------*/
$(document).ready(function(){
	if (localStorage['auth']) {
		storage = JSON.parse($.base64.decode(localStorage['auth']));
		sessionCreate(storage);
	}
});

/*----------------- Helper functions -----------------------*/
function connectFailed() {
	$('#connecting').hide().prev('#auth').show();
	$('#wrap').removeClass('connect_message');
}

function connectSuccess() {
	$('#connecting').hide().next('#chat').show();
	$('#wrap').removeClass('connect_message');
	$('.room_name').text(CHAT.room_name);
	checkLogout();
}

function checkLogout() {
	$('.logout').click(function(event){
		event.preventDefault();
		connection.disconnect();
		localStorage.removeItem('auth');
	});
}
