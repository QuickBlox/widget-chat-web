/* Helper functions for widget
-----------------------------------------------------------------------*/
var URL_REGEXP = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;

function connecting() {
	$('#main').hide();
	$('#connecting').show();
}

function connectFailure() {
	$('#connecting').hide();
	$('#main').show();
	$('#login-form input').addClass('error');
}

function connectSuccess() {
	$('#connecting').hide();
	$('#chats-wrap, #chat-room').show();
	$('.chat-content').html('');
	$('.send-message').val('');
	$('.users-list').html('<li class="list-title">Users</li>');
	$('.chats-list').html('<li class="list-title">Chats</li><li class="list-item">Chat Room</li>');
	switches.isLogout = false;
	createAnimatedLoadingUsers();
	createAnimatedLoadingMessages();
}

function signUpFailure() {
	$('#signup-form fieldset > input').addClass('error');
	$('#signup-form input').prop('disabled', false);
}

function signUpSuccess() {
	$('#signup-form').hide();
	$('#signup-success').show();
	setTimeout(backToLogin, 3 * 1000);
	
	function backToLogin() {
		$('#signup-success').hide();
		$('#main').show();
		$('#login-form input').val('').removeClass('error');
	}
}

function logoutSuccess() {
	$('.bubbles').removeClass('bubbles_login');
	$('.header').removeClass('header_login');
	$('#chats-wrap, #login-form').hide();
	$('.chat:not(#chat-room)').remove();
	$('#main, #auth').show();
	if (!switches.isLogout) window.location.reload();
}

function scrollToMessage(chat) {
	$(chat).find('.chat-content').scrollTo('*:last', 0);
}

function changeInputFileBehavior() {
	$('.uploader-wrap input:file').change(function() {
		var file = $(this).val();
		$(this).siblings('.uploader-text').val(file);
	});
}

function changeHeightChatBlock() {
	var chatHeaderHeight, chatContentHeight, chatFooterHeight, fixHeight = 2, fixUsersListHeight = 27;
	
	chatHeaderHeight = $('.chat-header').height();
	chatFooterHeight = $('.chat-footer').height();
	
	chatContentHeight = WIDGET_HEIGHT - chatHeaderHeight - chatFooterHeight - fixHeight;
	$('.chat-content').height(chatContentHeight);
	$('.users-list, .chats-list').css('max-height', chatContentHeight - fixUsersListHeight);
}

function getSmiles() {
	$(SMILES).each(function(i) {
		$('.smiles-list').append('<img class="smileicons" alt="icons" data-plain="' + SMILES[i].plain + '" src="images/smiles/' + SMILES[i].image + '">');
	});
}

function clickBehavior() {
	$(document).click(function(event) {
		var obj = $(event.target);
		
		if (obj.is('.hide-actions, .hide-actions *'))
			$('.actions-wrap').hide();
		else if (obj.is('.show-actions, .show-actions *'))
			if (obj.is('.list-item') || !$('.list').is(':visible'))
				$('.actions-wrap').show();
		
		if (!obj.is('.list-title, .smiles-list, .smiles-list *, .loading_users, .loading_users *')) {
			$('.show-list').removeClass('visible');
			$('.list').hide();
		}
	});
}

function showList(event) {
	var list = $(event.data.list);
	if (!switches.isOccupantsDownloaded)
		getOccupants();
	
	if ($(this).is('.users')) {
		$('.show-list:not(.users)').removeClass('visible');
		$('.list:not(.users-list)').hide();
	}
	if ($(this).is('.chats')) {
		$('.show-list:not(.chats)').removeClass('visible');
		$('.list:not(.chats-list)').hide();
	}
	if ($(this).is('.smiles')) {
		$('.show-list:not(.smiles)').removeClass('visible');
		$('.list:not(.smiles-list)').hide();
	}
	
	if ($(this).is('.visible'))
		list.hide();
	else
		list.show();
	
	$(this).toggleClass('visible');
	
	return false;
}

function choseSmile() {
	var messageField = $('.chat:visible .send-message');
	messageField.val(messageField.val() + ' ' + $(this).data('plain') + ' ');
}

function updateTime() {
	$('.message-time').timeago().removeAttr('title');
	setTimeout(updateTime, 60 * 1000);
}

function trim(str) {
	if (str.charAt(0) == ' ')
		str = trim(str.substring(1, str.length));
	if (str.charAt(str.length-1) == ' ')
		str = trim(str.substring(0, str.length-1));
	return str;
}

function getID(jid) {
	return Strophe.unescapeNode(Strophe.getResourceFromJid(jid));
}

function checkResponse(response) {
	try {
		return $.parseJSON(Strophe.unescapeNode(response));
	} catch(err) {
		return response;
	}
}

function parser(str, time) {
	var url, url_text;
	
	str = escapeHTML(str);
	str = takeQuote(str, time);
	
	// parser of paragraphs
	str = ('<p>' + str).replace(/\n\n/g, '<p>').replace(/\n/g, '<br>');
	
	// parser of links
	str = str.replace(URL_REGEXP, function(match) {
		url = (/^[a-z]+:/i).test(match) ? match : 'http://' + match;
		url_text = match;
		return '<a href="' + escapeHTML(url) + '" target="_blank" class="hide-actions">' + escapeHTML(url_text) + '</a>';
	});
	
	// parser of smiles
	$(SMILES).each(function(i) {
		str = str.replace(SMILES[i].regex, '<img class="smileicons" alt="icons" src="images/smiles/' + SMILES[i].image + '">');
	});
	
	return str;
	
	function escapeHTML(s) {
		return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
}

function createAnimatedLoadingUsers() {
	$('.users-list').append('<li class="loading_users"><div id="floatingCirclesG_users"></div></li>');
	for (var i = 1; i < 9; i++)
		$('#floatingCirclesG_users').append('<div class="f_circleG_users" id="frotateG_0'+i+'_users"></div>');
}

function createAnimatedLoadingMessages() {
	$('.chat-content').append('<div class="loading_messages"><div id="floatingCirclesG_messages"></div></div>');
	for (var i = 1; i < 9; i++)
		$('#floatingCirclesG_messages').append('<div class="f_circleG_messages" id="frotateG_0'+i+'_messages"></div>');
}

function addTypingMessage(obj, name) {
	obj.text(obj.text().split(' ...')[0].concat(', ').concat(name).concat(' ...'));
}

function removeTypingMessage(obj, name) {
	obj.text(obj.text().replace(', ' + name, '').replace(name + ', ', '').replace(name + ' ...', ''));
	if (obj.text().length == 0) obj.remove();
}
