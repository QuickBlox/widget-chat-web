<?php

function GETRequest($url, $token) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array("QB-Token: $token"));
	$result = curl_exec($ch);
	curl_close($ch);
	
	return $result;
}

function POSTRequest($url, $data, $token) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_POST, strlen($data));
	curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	if ($token) {
		curl_setopt($ch, CURLOPT_HTTPHEADER, array("QB-Token: $token"));
	}
	$result = curl_exec($ch);
	curl_close ($ch);
	
	return $result;
}

?>
