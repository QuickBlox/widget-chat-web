// Widget flexible settings
var widgetWidth = $('body').width();
var widgetHeight = $('body').height();

if (widgetWidth < 200)
	$('html').addClass('html-55');
if (widgetWidth >= 300 && widgetHeight >= 400)
	$('html').addClass('html-80');
if (widgetWidth >= 400 && widgetHeight >= 500)
	$('html').addClass('html-90');
	
if (widgetWidth > 300 && widgetHeight >= 350)
	$('html').addClass('flexible');
