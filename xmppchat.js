/*
 * QuickBlox Web XMPP Chat sample
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var sessionObj, login, pass, params, connection;

$(document).ready(function(){
	var storage = localStorage['auth'];
	if (storage) {
		sessionObj = JSON.parse($.base64.decode(storage));
		sessionCreate(sessionObj);
		console.log(sessionObj);
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
					
					sessionObj = {type: 0, login: login, password: pass};
					localStorage['auth'] = $.base64.encode(JSON.stringify(sessionObj));
					
					xmppConnect(result.id, result.ful_name, pass);
				}
			});
		}
	});
}

function xmppConnect(user_id, user_full_name, pass) {
	connection = new Strophe.Connection(CHAT.bosh_url);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	console.log(connection);
	
	connection.connect(user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server, pass, function (status) {
		console.log(status);
		if (status == 6) {
			xmppConnect(user_id, user_full_name, pass);
		} else if (status == 5) {
			connection.muc.join(CHAT.room, user_full_name);
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
