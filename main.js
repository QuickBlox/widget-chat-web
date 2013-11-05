/* Widget Code Generator Scripts */
$(document).ready(function(){
	$('form').ajaxForm({
		beforeSubmit: function(data, form, options) {
	  	$('.alert').remove();
	  	form.find(':input').prop('disabled', true);
		},
		success: function(response, statusText, xhr, form) {
			var obj = $.parseJSON(response);
	    if (obj.success) {
	    	$('#xmpp-widget').before('<div class="alert alert-success"><strong>Success!</strong> ' + obj.message + '</div>');
	    	$('#xmpp-widget').before('<textarea class="form-control" rows="3">' + obj.code + '</textarea>');
	    	$('#xmpp-widget').hide();
	    } else {
	    	$('#xmpp-widget').before('<div class="alert alert-danger"><strong>Error!</strong> ' + obj.message + '</div>');
		  }
		  $.scrollTo('.header-wrap');
		  form.find(':input').prop('disabled', false);
		}
	});
});
