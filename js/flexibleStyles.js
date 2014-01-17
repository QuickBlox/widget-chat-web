// Widget flexible settings
var widgetWidth = $('body').width();
var widgetHeight = $('body').height();

if (widgetWidth < 200)
	$('html').css('font-size','55%');
if (widgetWidth >= 300 && widgetHeight >= 400)
	$('html').css('font-size','80%');
if (widgetWidth >= 400 && widgetHeight >= 500)
	$('html').css('font-size','90%');
