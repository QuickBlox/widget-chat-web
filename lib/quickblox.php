<?php

require_once 'curl.php';

function qbAuth($appId, $authKey, $authSecret, $login, $password) {
	$nonce = rand(0, 1000);
	$timestamp = time();
	
	if ($login && $password) {
		$message = "application_id=$appId&auth_key=$authKey&nonce=$nonce&timestamp=$timestamp&user[login]=$login&user[password]=$password";
	} else {
		$message = "application_id=$appId&auth_key=$authKey&nonce=$nonce&timestamp=$timestamp";
	}
	$signature = hash_hmac("sha1", $message, $authSecret);
	
	$url = "http://api.quickblox.com/session.json";
	$data = "$message&signature=$signature";
	$response = POSTRequest($url, $data, false);
	
	$obj = json_decode($response, true);
	$token = $obj['session']['token'];
	
	return $token;
}

function qbCustomGet($params, $token) {
	foreach($params as $key=>$value) { $params_string .= $key.'='.urlencode($value).'&'; }
	rtrim($params_string, '&');
	
	$url = "http://api.quickblox.com/data/widgets.json?$params_string";
	$response = GETRequest($url, $token);
	
	$obj = json_decode($response, true);
	$widgets = $obj['items'];

	return $widgets;
}

function qbCustomCreate($params, $token) {
	foreach($params as $key=>$value) { $params_string .= $key.'='.urlencode($value).'&'; }
	rtrim($params_string, '&');
	
	$url = "http://api.quickblox.com/data/widgets.json";
	$data = $params_string;
	$response = POSTRequest($url, $data, $token);
}

?>
