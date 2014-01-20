/* Flexible settings of widget
-----------------------------------------------------------------*/
var WIDGET_WIDTH = $('body').width();
var WIDGET_HEIGHT = $('body').height();

if (WIDGET_WIDTH < 200)
	$('html').addClass('html-55');
if (WIDGET_WIDTH >= 300 && WIDGET_HEIGHT >= 400)
	$('html').addClass('html-80');
if (WIDGET_WIDTH >= 400 && WIDGET_HEIGHT >= 500)
	$('html').addClass('html-90');
	
if (WIDGET_WIDTH > 300 && WIDGET_HEIGHT >= 350)
	$('html').addClass('flexible');
