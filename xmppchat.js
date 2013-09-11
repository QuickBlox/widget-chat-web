/*
 * QuickBlox Web XMPP Chat sample
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */

var login, email, pass, connection;

function authQB() {
	$('#buttons').hide().next().show();
}

function sessionCreate() {
	var tmp = $('#login').val();
	
	pass = $('#password').val();
	
	QB.init(QBPARAMS.app_id, QBPARAMS.auth_key, QBPARAMS.auth_secret);
	QB.createSession(function(err, result){
		if (err) {
			console.log('Something went wrong: ' + err);
		} else {
			console.log(result);
			QB.login({login: login, password: pass}, function(err, result){
				if (err) {
					console.log('Something went wrong: ' + err);
				} else {
					console.log(result);
					$('#auth').hide();
					$('#chat').show();
					xmpp(result.id, result.login, pass);
				}
			});
		}
	});
}

function xmpp(user_id, user_login, pass) {
	connection = new Strophe.Connection(CHAT.bosh_url);
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	console.log(connection);
	
	connection.connect(user_id + "-" + QBPARAMS.app_id + "@" + CHAT.server, pass, function (status) {
		console.log(status);
		if (status == 6) {
			xmpp(user_id, user_login, pass);
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
