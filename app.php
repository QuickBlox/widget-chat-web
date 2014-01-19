<?php
	require_once 'server/auth.php';
	
	$version = '2.0.0a'; #current version of widget
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>QB Group Chat Room (XMPP)</title>
	<link rel="stylesheet" href="qbchatroom.css">
	<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
	
	<!-- This is a config block -->
	<script>
	//QB Account params
	var QBPARAMS = {
		app_id: '<?php echo $appId; ?>',
		auth_key: '<?php echo $authKey; ?>',
		auth_secret: '<?php echo $authSecret; ?>'
	}
	//Chat params
	var CHAT = {
		roomJID: '<?php echo $roomJid; ?>',
		server: 'chat.quickblox.com',
		bosh_url: 'http://chat.quickblox.com:5280'
	}
	//FB params
	var FBPARAMS = {
		app_id: '368137086642884',
		graph_server: 'https://graph.facebook.com'
	}
	</script>
</head>
<body>
	<div id="fb-root"></div>
	<!-- flexibleStyles.js needs to choose current sizes for widget -->
	<script src="js/flexibleStyles.js"></script>
	
	<div id="main" class="layout">
		<div class="bubbles">
			<div class="bubble bubble_green"></div>
			<div class="bubble bubble_blue"></div>
			<div class="bubble bubble_light_blue"></div>
		</div>
		<header class="header">
			<div class="center-wrap">
				<h1>QuickBlox<br><b>Chat Room</b></h1>
			</div>
		</header>
		
		<div id="auth">
			<div class="center-wrap">
				<button class="btn_fb" onclick="authFB()"><span>Login with FB</span></button>
				<button class="btn_qb" onclick="authQB()"><span>Login with QB</span></button>
			</div>
		</div>
		
		<div id="login-fom" class="hidden">
			<form action="#" class="center-wrap">
				<fieldset>
					<input id="login" type="text" placeholder="Login or email">
					<input id="pass" type="password" placeholder="Password">
				</fieldset>
				<button class="btn_qb" onclick="formDataLogin(); return false;"><span>Connect</span></button>
				<span class="not-registered">Not registered yet?<br>
					<a href="#" onclick="signUp(); return false;">Register an account QuickBlox</a>
				</span>
			</form>
		</div>
	</div>
	
	<div id="connecting" class="layout hidden">
		<span class="progress">
			<p>Connecting. Please wait...</p>
			<progress></progress>
		</span>
	</div>
	
	<div id="signup-form" class="layout hidden">
		<form action="#" class="center-wrap" enctype="multipart/form-data">
			<fieldset>
				<input id="signup_name" type="text" placeholder="Full Name">
				<input id="signup_email" type="text" placeholder="Email">
				<input id="signup_login" type="text" placeholder="Login">
				<input id="signup_pass" type="password" placeholder="Password">
				<div class="uploader-wrap">
					<img src="images/upload.png" alt="upload">
					<input class="uploader-text" type="text" placeholder="User picture">
					<input id="signup_avatar" type="file" accept="image/*">
				</div>
			</fieldset>
			<button class="btn_qb" onclick="formDataSignUp(); return false;"><span>Register</span></button>
		</form>
	</div>
	
	<div id="signup-success" class="layout hidden">
		<span class="progress">Thanks for your<br>registration!</span>
	</div>
	
	<div id="chat">
	<!--
		<header class="chat-header">
			<div class="occupants" onclick="occupants()">
				<span class="number"></span>
				<img src="" alt="users" />
				<ul class="list"></ul>
			</div>
			<div class="logout-wrap">
				<a href="#" class="logout" onclick="checkLogout(); return false;">Logout</a>
			</div>
			<h3 class="room_name">XMPP Group Chat</h3>
		</header>
		
		<section class="chat-content"></section>
		
		<footer class="chat-footer">
			<form id="qb_send_message" action="#">
				<input type="text" id="message"/>
				<textarea class="message_field" type="text" placeholder="Enter message..."></textarea>
				<button onclick="sendMesage(); return false;">Send</button>
				<div id="area">
					<div class="controls"><span class="title">Message</span><span class="smiles"><img src="images/smile.png" alt="smiles" width="20" /></span></div>
					<textarea name="message_area" id="message_area"></textarea>
				</div>
			</form>
		</footer>
		-->
	</div>
	
	<!-- include outside js libraries -->
	<script src="js/libs/quickblox.js"></script>
	<script src="js/libs/strophe.js"></script>
	<script src="js/libs/strophe.muc.js"></script>
	<script src="js/libs/jquery.scrollTo-min.js"></script>

	<!-- scripts of widget -->
	<script src="js/smiles.js"></script>
	<script src="js/helpers.js"></script>
	<script src="qbchatroom.js"></script>
</body>
</html>
