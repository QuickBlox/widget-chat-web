/*
 * QuickBlox Web XMPP Chat sample
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var sessionObject, login, pass, params, connection;

$(document).ready(function(){
	var storage = localStorage['auth'];
	if (storage) {
		sessionObject = JSON.parse($.base64.decode(storage));
		console.log(sessionObject);
		sessionCreate(sessionObject);
	}
	
	$('.logout').click(function(){
		localStorage.removeItem('auth');
		$('#buttons').show().next().hide();
		$('#auth').show().next().next().hide();
	});
});

function authQB() {
	$('#buttons').hide().next().show().find('input').val('');
}

function sessionCreate(sessionObject) {
	$('#auth').hide().next().show();
	$('#wrap').addClass('connect_message');
	
	if (sessionObject) {
		login = sessionObject.login;
		pass = sessionObject.password;
	} else {
		login = $('#login').val();
		pass = $('#password').val();
	}
	
	if (login.indexOf('@') > 0) {
		params = {email: login, password: pass}
	} else {
		params = {login: login, password: pass}
	}
	
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	QB.createSession(function(err, result){
		if (err) {
			console.log('Something went wrong: ' + err.detail);
			$('#connecting').hide().prev().show();
			$('#wrap').removeClass('connect_message');
		} else {
			console.log(result);
			
			QB.login(params, function(err, result){
				if (err) {
					console.log('Something went wrong: ' + err.detail);
					$('#connecting').hide().prev().show();
					$('#wrap').removeClass('connect_message');
				} else {
					console.log(result);
					$('#connecting').hide().next().show();
					$('#wrap').removeClass('connect_message');
					
					sessionObject = {type: 0, login: login, password: pass};
					localStorage['auth'] = $.base64.encode(JSON.stringify(sessionObject));
					
					//xmppConnect(result.id, result.login, pass);
				}
			});
		}
	});
}

function xmppConnect(user_id, user_login, pass) {
	connection = new Strophe.Connection(CHAT.bosh_url);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	console.log(connection);
	
	connection.connect(user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server, pass, function (status) {
		console.log(status);
		if (status == 6) {
			xmppConnect(user_id, user_login, pass);
		} else if (status == 5) {
			connection.muc.join(CHAT.room, user_login);
		}
	});
}

function rawInput(data) {
    console.log('RECV: ' + data);
}

function rawOutput(data) {
    console.log('SENT: ' + data);
}

function sendMesage() {
	connection.muc.message(CHAT.room, null, $('#message').val(), 'groupchat');
}
