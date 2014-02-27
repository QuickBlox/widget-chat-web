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
	$('.chats-list').html('<li class="list-title">Chats</li>');
	$('.chats-list').append('<li class="list-item switch-chat" data-id="chat-room">Chat Room <span class="messages-count"></span></li>');
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
	$('#chats-wrap, #login-form, .chats').hide();
	$('.chat:not(#chat-room)').remove();
	$('#main, #auth').show();
	if (!switches.isLogout) window.location.reload();
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

function choseSmile() {
	var messageField = $('.chat:visible .send-message');
	messageField.val(messageField.val() + ' ' + $(this).data('plain') + ' ');
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

function getJID(id) {
	return id + "-" + QBAPP.appID + "@" + CHAT.server;
}

function getIDFromResource(jid) {
	return Strophe.unescapeNode(Strophe.getResourceFromJid(jid));
}

function getIDFromNode(jid) {
	return Strophe.getNodeFromJid(jid).split('-')[0];
}

function getIDFromChat() {
	return $('.chat:visible').attr('id').split('-')[1];
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

function choseSelector(id) {
	return $('#chat-room').add('#chat-' + id).find('.chat-content');
}

function scrollToMessage(selector) {
	selector.scrollTo('*:last', 0);
}

function editUsersCount(selector, val) {
	selector.parent().not('#chat-room').find('.users-count').text(val);
}

function editMessagesCount(id, time) {
	var selector, messagesCount;
	
	selector = $('.switch-chat[data-id=' + id + ']'); 
	if (selector[0] && !time && !$('#' + id).is(':visible')) {
		messagesCount = parseInt(selector.find('.messages-count').text()) || 0;
		messagesCount++;
		selector.find('.messages-count').text(messagesCount).css('padding', '0 .4rem');
	}
}

function deleteMessageCount(id) {
	$('.switch-chat[data-id=' + id + ']').find('.messages-count').text('').css('padding', '0');
}

function switchСhat(event) {
	var id, selector;
	
	if (!$(event.target).is('.remove')) {
		id = '#' + $(this).data('id');
		selector = $(id).find('.chat-content');
		
		$('.chat:visible').hide();
		$(id).show();
		scrollToMessage(selector);
		deleteMessageCount($(this).data('id'));
	}
}

function addRemoveButton() {
	if ($(this).data('id') != 'chat-room')
		$(this).append('<span class="remove">x</span>');
}

function deleteRemoveButton() {
	$(this).find('.remove').remove();
}

function removeChat() {
	var id, chatsCount;
	
	id = '#' + $(this).parent().data('id');
	chatsCount = parseInt($('.chats-count:first').text());
	
	$(this).parent().remove();
	$('.chats-count').text(--chatsCount);
	if ($('.chat:visible').attr('id') == id.substring(1)) {
		$(id).remove();
		$('#chat-room').show();
	} else {
		$(id).remove();
	}
	
	if ($('.switch-chat').length == 1)
		$('.chats').hide();
}

function checkTypeChatState(jid, type) {
	if (jid)
		connection.chatstates[type](jid);
	else
		connection.chatstates[type](CHAT.roomJID, 'groupchat');
}

function setCallback(callback, name, type) {
	connection.addHandler(callback, null, name, type, null, null);
}

function centerPopup() {
	var winWidth, winHeight, scrollPos, disWidth, disHeight, popupWidth = 800, fixHeight = 150;
	
	winWidth = $(window).width();
	winHeight = $(window).height();
	scrollPos = $(window).scrollTop();
	
	disWidth = (winWidth - popupWidth) / 2;
	disHeight = scrollPos + fixHeight;
	
	$('#videochat').css({'width': popupWidth + 'px', 'top': disHeight + 'px', 'left': disWidth + 'px'});
	$('#videochat-overlay').css({'width': winWidth + 'px', 'height': winHeight + 'px'});
	
	return false;
}

function closeVideoChat() {
	$('#videochat').hide();
	$('#videochat-overlay').remove();
}
