<?php

require_once 'config.php';
require_once 'lib/quickblox.php';

$appId = null;
$authKey = null;
$authSecret = null;
$roomJid = null;
$domain = null; #for WP plugin
$paramResponse = 0; #for WP plugin

$errorMessage = null;
$generatedCode = null;

if (isset($_POST['app_id'])) {
	$appId = $_POST['app_id'];
}

if (isset($_POST['auth_key'])) {
	$authKey = $_POST['auth_key'];
}

if (isset($_POST['auth_secret'])) {
	$authSecret = $_POST['auth_secret'];
}

if (isset($_POST['room_jid'])) {
	$roomJid = $_POST['room_jid'];
}

if (isset($_POST['domain'])) {
	$domain = $_POST['domain'];
}

if (isset($_POST['param_response'])) {
	$paramResponse = $_POST['param_response'];
}

if ($appId && $authKey && $authSecret && $roomJid) {
	$token = qbAuth($appId, $authKey, $authSecret, false, false);
	
	if ($token != '') {
		$adminToken = qbAuth($QB['app_id'], $QB['auth_key'], $QB['auth_secret'], $QB['login'], $QB['password']);
		
		$params = array('room_jid' => $roomJid);
		$widgets = qbCustomGet($params, $adminToken);

		if (count($widgets) > 0) {
			$key = $widgets[0]['key'];
		} else {
			$timestamp = time();
			$str = $roomJid.'&'.$timestamp;
			$key = sha1($str);
			
			$params = array('app_id' => $appId,
											'auth_key' => $authKey,
											'auth_secret' => $authSecret,
											'room_jid' => $roomJid,
											'domain' => $domain,
											'key' => $key);
			qbCustomCreate($params, $adminToken);
		}
		
		$generatedCode = array('success' => true,
													 'message' => "Just copy this code and pase into your webpage.",
													 'code' => "<div id='qb-xmppchat'><iframe src='http://quickblox.com/applications/xmppchat/app.php?key=$key' frameborder=0 scrolling='no' width=100% height=100%></iframe></div>");
	} else {
		$errorMessage = array('success' => false,
													'message' => "There is no QuickBlox application with specified parameters. Check parameters (application id, auth key and auth secret), please.");
	}
} else {
	$errorMessage = array('success' => false,
												'message' => "You should fill out all of the fields.");
}

if ($paramResponse == 0) {
	if ($errorMessage) {
		echo json_encode($errorMessage);
	} else {
		echo json_encode($generatedCode);
	}
} else {
	echo $key;
}

?>
