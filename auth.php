<?php 

require_once 'config.php';
require_once 'lib/quickblox.php';

$key = null;
if (isset($_GET['key'])) {
	$key = $_GET['key'];
}

if ($key) {
	$adminToken = qbAuth($QB['app_id'], $QB['auth_key'], $QB['auth_secret'], $QB['login'], $QB['password']);
	
	$params = array('key' => $key);
	$widgets = qbCustomGet($params, $adminToken);
	
	if (count($widgets) > 0) {
		$appId = $widgets[0]['app_id'];
		$authKey = $widgets[0]['auth_key'];
		$authSecret = $widgets[0]['auth_secret'];
		$roomJid = $widgets[0]['room_jid'];
	}
}

?>
