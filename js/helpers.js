/* Helper functions for widget
-----------------------------------------------------------------------*/
var URL_REGEXP = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;

function connectFailure() {
	$('#connecting').hide();
	$('#main').show();
	$('#login-fom input').addClass('error');
}

function connectSuccess() {
	isLogout = false;
	$('#connecting').hide();
	$('#chat').show();
	$('#chat .chat-content').html('');
	$('#chat #message').val('');
	createMessagesLoadingIcon();
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
		$('#login-fom input').val('').removeClass('error');
	}
}

function logoutSuccess() {
	if (!isLogout) location.reload();
	$('.bubbles').removeClass('bubbles_login');
	$('.header').removeClass('header_login');
	$('#chat, #login-fom').hide();
	$('#main, #auth').show();
}

function changeInputFileBehavior() {
	$('.uploader-wrap input:file').change(function() {
		var file = $(this).val();
		$(this).siblings('.uploader-text').val(file);
	});
}

function changeHeightChatBlock() {
	var fixHeight = 2;
	var fixUsersListHeight = 27;
	var chatHeaderHeight = $('.chat-header').height();
	var chatFooterHeight = $('.chat-footer').height();
	var chatContentHeight;
	
	chatContentHeight = WIDGET_HEIGHT - chatHeaderHeight - chatFooterHeight - fixHeight;
	$('.chat-content').height(chatContentHeight);
	$('.users-list').css('max-height', chatContentHeight - fixUsersListHeight);
}

function getSmiles() {
	$(SMILES).each(function(i) {
		$('.smiles-list').append('<img class="smileicons" alt="icons" data-plain="' + SMILES[i].plain + '" src="images/smiles/' + SMILES[i].image + '">');
	});
}

function clickBehavior() {
	$(document).click(function(e) {
		if ($(e.target).is('.hide-actions, .hide-actions *')) {
			$('.actions-wrap').hide();
		}
		else if ($(e.target).is('.show-actions, .show-actions *')) {
			if ($(e.target).is('.user') || !$('.users').is('.visible') && !$('.smiles').is('.visible'))
				$('.actions-wrap').show();
		}
		if (!$(e.target).is('.users, .users-list-title, .loading_users, .loading_users *')) {
			$('.users').removeClass('visible');
			$('.users-list').hide();
		}
		if (!$(e.target).is('.smiles, .smiles-list, .smiles-list *')) {
			$('.smiles').removeClass('visible');
			$('.smiles-list').hide();
		}
	});
}

function showList(obj) {
	var objList = obj + '-list';
	
	if ($(obj).is('.visible')) {
		$(obj).removeClass('visible');
		$(objList).hide();
	} else {
		$(obj).addClass('visible');
		$(objList).show();
	}
}

function choseSmile(img) {
	var tmp = $('#message').val() + ' ' + $(img).data('plain') + ' ';
	$('#message').val(tmp);
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

function getQBId(jid) {
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
	var quote;
	var signal = $('#signal')[0];
	
	// parser of invalid xml symbols
	str = escapeHTML(str);
	
	// parser of quote
	quote = str.split(' ')[0].charAt(0) == '@' && str.split(' ')[0];
	if (quote) {
		str = str.replace(quote, '<b>' + escapeSpace(quote) + '</b>');
		if (escapeSpace(quote.split('@')[1]) == chatUser.nick && !time)
			signal.play();
	}
	
	// parser of paragraphs
	str = ('<p>' + str).replace(/\n\n/g, '<p>').replace(/\n/g, '<br>');
	
	// parser of links
	str = str.replace(URL_REGEXP, function(match) {
		var url = (/^[a-z]+:/i).test(match) ? match : 'http://' + match;
		var url_text = match;
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
	function escapeSpace(s) {
		return s.replace("%20", ' ');
	}
}

function createUsersLoadingIcon() {
	$('.users-list').append('<li class="loading_users"><div id="floatingCirclesG_users"></div></li>');
	for (var i = 1; i < 9; i++) {
		$('#floatingCirclesG_users').append('<div class="f_circleG_users" id="frotateG_0'+i+'_users"></div>');
	}
}

function createMessagesLoadingIcon() {
	$('.chat-content').append('<div class="loading_messages"><div id="floatingCirclesG_messages"></div></div>');
	for (var i = 1; i < 9; i++) {
		$('#floatingCirclesG_messages').append('<div class="f_circleG_messages" id="frotateG_0'+i+'_messages"></div>');
	}
}

function createUserItem(user) {
	var qb = user.id;
	var fb = user.facebook_id || '';
	var name = user.full_name;
	//var iconClass = user.facebook_id ? 'user_fb_icon' : 'user_qb_icon';
	
	$('.users-list').append('<li class="user show-actions" data-qb="' + qb + '" data-fb="' + fb + '" onclick="showActionsToolbar(this)">' + name + '</li>');
	storageUsersKeys[String(qb)] = name;
	return name;
}

function quote(link) {
	var quote = '@' + $(link).data('nick').replace(/ /g, "%20") + ' ';
	$('#message').focus().val(quote);
}
