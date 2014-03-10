/* Insert your QB application credentials
-----------------------------------------------*/
var QBAPP = {
	appID: 6566,
	authKey: 'pm6CarZjJQC9c3b',
	authSecret: 'pFPBSJD8t2xY5Br'
};

var CHAT = {
	roomJID: '6566_test@muc.chat.quickblox.com',
	server: 'chat.quickblox.com',
	bosh: 'http://chat.quickblox.com:5280'
};

var FBAPP_ID = '368137086642884';

/* STUN/TURN servers */
var ICE_SERVERS = {
	urls: [
		'stun:stun.l.google.com:19302',
		'turn:turnserver.quickblox.com:3478?transport=udp',
		'turn:turnserver.quickblox.com:3478?transport=tcp'
	],
	username: 'user',
	password: 'user'
};
