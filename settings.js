// Widget settings
var WIDGET_WIDTH = $('body').width();
var WIDGET_HEIGHT = $('body').height();

if (WIDGET_WIDTH < 350 || WIDGET_HEIGHT < 350)
	$('head').append('<link rel="stylesheet" href="css/less350px.css" />');
	
if (WIDGET_WIDTH >= 350 && WIDGET_HEIGHT >= 350 && WIDGET_HEIGHT < 500)
	$('head').append('<link rel="stylesheet" href="css/less500px.css" />');
	
if (WIDGET_WIDTH > 960)
	$('#auth').css('background-size', '100%');
