/*----------------- Helper functions ---------------------*/
function connectFailed() {
	$('#connecting').hide();
	$('#main').show();
	$('#login-fom input').addClass('error');
}

function connectSuccess(username) {
	$('#connecting').hide();
	$('#chat').show();
	$('#chat input').val('').removeClass('error');
	/*$('.logout').attr('data-username', username);
	textareaUp();
	smiles();*/
}

function signUpFailed() {
	$('#signup-form fieldset > input').addClass('error');
	$('#signup-form input').prop('disabled', false);
}

function signUpSuccess() {
	function timeout() {
		$('#signup-success').hide();
		$('#main').show();
		$('#login-fom input').val('').removeClass('error');
	}
	
	$('#signup-form').hide();
	$('#signup-success').show();
	setTimeout(timeout, 3 * 1000);
}

function checkLogout() {
	if (localStorage['qbAuth']) {
		localStorage.removeItem('qbAuth');
	} else {
		FB.logout(function(response) {
			console.log("[FB Logout]");
			console.log(response);
		});
	}

	var nick = $('.logout').data('data-username');
	connection.muc.leave(CHAT.roomJID, nick);
	setTimeout(function() {connection.disconnect()}, 1000);
}

function linkURLs(text) {
	var url_regexp = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
	
	var link = text.replace(url_regexp, function(match) {
		var url = (/^[a-z]+:/i).test(match) ? match : "http://" + match;
		var url_text = match;
		
		return "<a href=\""+escapeHTML(url)+"\" target=\"_blank\">"+escapeHTML(url_text)+"</a>";
	});
	
	return link;
}

function escapeHTML(s) {
	return s.replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function textareaUp() {
	$('.message_field').click(function(){
		$('#area').show();
		$('#message_area').focus();
	});
	$(document).click(function(e){
		if ($(e.target).is('.message_field, #message_area, .controls, .controls *, .smiles-icons, .smiles-icons *')) {
			return;
		}
	  $('.message_field').val($('#message_area').val());
	  $("#area").hide();
	});
}

function toHTML(str) {
	return ('<p>' + str).replace(/\n\n/g, '<p>').replace(/\n/g, '<br>');
}

function smilesParser(text) {
	for(var i = SMILEICONS.length-1; i >= 0; i--) {
		text = text.replace(SMILEICONS[i].regex, '$2<img class="smileicons" alt="$1" src="images/smiles/' + SMILEICONS[i].image + '" />$3');
	}
	return text;
}

function smiles() {
	$('.smiles-icons').remove();
	$('#area').append('<div class="smiles-icons"></div>');
	for(var i = 0; i < SMILEICONS.length; i++) {
		$('.smiles-icons').append('<img class="smileicons" alt="icons" data-plain="' + SMILEICONS[i].plain + '" src="images/smiles/' + SMILEICONS[i].image + '" />');
	}
	
	$('.smiles').click(function(){
		$(this).css('background','#dadada');
		$(this).parents('#area').find('.smiles-icons').show();
	});
	$(document).click(function(e){
		if ($(e.target).is('.smiles *, .smiles-icons, .smiles-icons *')) {
			if ($(e.target).is('.smiles-icons *')) {
				$('#message_area').val($('#message_area').val() + ' ' + $(e.target).data('plain') + ' ');
			}
			return;
		}
	  $('.smiles-icons').hide();
	  $('.smiles').css('background','none');
	});
}

/*
* Making a custom style for input file
*/
function inputFileBehavior() {
	$('.uploader-wrap input:file').change(function() {
		var file = $(this).val();
		$(this).siblings('.uploader-text').val(file);
	});
}

/*
* This function trims all gaps in the begin and in the end of your string.
* 
* For example:
* trim("   String   ") => "String"
*/
function trim(str) {
	if (str.charAt(0) == ' ')
		str = trim(str.substring(1, str.length));
	if (str.charAt(str.length-1) == ' ')
		str = trim(str.substring(0, str.length-1));
	return str;
}
