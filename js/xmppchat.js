/*
 * QuickBlox Web XMPP Chat sample
 *
 * Author: Andrey Povelichenko (andrey.povelichenko@quickblox.com)
 *
 */
 
//QB Account params
var qbParams = {
    app_id: 3907,
    auth_key: 'jRVze-6OzVDh-WX',
    auth_secret: 'uX8dZDexGW8TrEe'
}

var connection = null;
var id, pas;

$(document).ready(function() {
	QB.init(qbParams.app_id, qbParams.auth_key, qbParams.auth_secret);
	
	QB.createSession({login: 'anryogo', password: 'injoit00'}, function(err, result){
		if (err) {
			console.log('Something went wrong: ' + err);
		} else {
			console.log(result);
		}
	});
});

function onConnect(status) {
	console.log(status);
	if (status == 6) {
		connection = new Strophe.Connection('http://chat.quickblox.com:5280');
		connection.rawInput = rawInput;
		connection.rawOutput = rawOutput;
		console.log(connection);
		connection.connect(id+"-3907@chat.quickblox.com", pas, onConnect);
	} else if (status == 5) {
	
		/*console.log(111);
		connection.muc.init(connection);
		console.log(connection);
		var d = $pres({"from":"386-3907@chat.quickblox.com","to":"3907_test@muc.chat.quickblox.com"}).c("x",{"xmlns":"http://jabber.org/protocol/muc"});
		console.log(d);
		connection.send(d.tree());
		console.log(connection.send(d.tree()));
		connection.muc.createInstantRoom("3907_test@muc.chat.quickblox.com");*/


		//connection.muc.init(connection);
		connection.muc.join('3907_test@muc.chat.quickblox.com', id);
        //connection.muc.groupchat('3907_test@muc.chat.quickblox.com', "test message", null);
		
		/*var message = $msg({to: '3907_test@muc.chat.quickblox.com', from: '386-3907@chat.quickblox.com', type: 'groupchat'}).c('body').t("Hello");
        connection.send(message.tree());*/
	} else {
		connection.addHandler(notifyUser, null, 'message', null, null,  null);
		connection.send($pres().tree());
	}
}

function mesage() {
	/*var message = $msg({to: '3907_test@muc.chat.quickblox.com', from: '386-3907@chat.quickblox.com', type: 'groupchat'}).c('body').t("Hello");
    connection.send(message);*/

	
	connection.muc.message('3907_test@muc.chat.quickblox.com', null, $('#mes').val(), 'groupchat');
}

function auth() {
    id = $('#id').val();
	pas = $('#pas').val();
	$('#form').hide().next().show();
	
	
	connection = new Strophe.Connection('http://chat.quickblox.com:5280');
	connection.rawInput = rawInput;
	connection.rawOutput = rawOutput;
	console.log(connection);
	connection.connect(id+"-3907@chat.quickblox.com", pas, onConnect);
}

function rawInput(data)
{
    console.log('RECV: ' + data);
}

function rawOutput(data)
{
    console.log('SENT: ' + data);
}
