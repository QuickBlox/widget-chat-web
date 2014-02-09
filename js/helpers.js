/* Helper functions for widget
-----------------------------------------------------------------------*/
var URL_REGEXP = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;

function connectFailure() {
	$('#connecting').hide();
	$('#main').show();
	$('#login-fom input').addClass('error');
}

function connectSuccess() {
	$('#connecting').hide();
	$('#chat').show();
	$('#chat .chat-content').html('');
	$('#chat #message').val('');
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
	var chatHeaderHeight = $('.chat-header').height();
	var chatFooterHeight = $('.chat-footer').height();
	var chatContentHeight;
	
	chatContentHeight = WIDGET_HEIGHT - chatHeaderHeight - chatFooterHeight - fixHeight;
	$('.chat-content').height(chatContentHeight);
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
		if (!$(e.target).is('.users, .users-list-title')) {
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

function checkResponse(response) {
	try {
		return $.parseJSON(Strophe.unescapeNode(response));
	} catch(err) {
		return response;
	}
}

function getAuthorName(jid) {
	return Strophe.unescapeNode(Strophe.getResourceFromJid(jid));
}

function parser(str) {
	var str = ('<p>' + escapeHTML(str)).replace(/\n\n/g, '<p>').replace(/\n/g, '<br>').replace(URL_REGEXP, function(match) {
		var url = (/^[a-z]+:/i).test(match) ? match : 'http://' + match;
		var url_text = match;
		
		return '<a href="' + escapeHTML(url) + '" target="_blank" class="hide-actions">' + escapeHTML(url_text) + '</a>';
	});
	
	$(SMILES).each(function(i) {
		str = str.replace(SMILES[i].regex, '<img class="smileicons" alt="icons" src="images/smiles/' + SMILES[i].image + '">');
	});
	return str;
	
	function escapeHTML(s) {
		return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
}

function showActionsToolbar() {
	var html = '<a href="#" class="btn btn_action"><span>Reply</span></a>';
	html += '<a href="#" class="btn btn_action"><span>Private message</span></a>';
	html += '<a href="#" class="btn btn_action"><span>View profile</span></a>';
	
	$('.actions').html(html);
}
