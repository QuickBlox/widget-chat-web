<?php
	require_once 'auth.php';
	
	$version = '2.0.0a'; #current version of widget
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>QB Group Chat Room (XMPP)</title>
	<link rel="stylesheet" href="xmppchat.css" />
	<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
	
	<script>
		//QB Account params
		var QBPARAMS = {
			app_id      : '<?php echo $appId; ?>',
			auth_key    : '<?php echo $authKey; ?>',
			auth_secret : '<?php echo $authSecret; ?>'
		}
		//Chat params
		var CHAT = {
			roomJID     : '<?php echo $roomJid; ?>',
			server      : 'chat.quickblox.com',
			bosh_url    : 'http://chat.quickblox.com:5280'
		}
		//FB params
		var FB_APP_ID = '368137086642884';
	</script>
</head>
<body>
	<div id="fb-root"></div>
	
	<div class="bubbles">
		<div class="bubble bubble_green"></div>
		<div class="bubble bubble_blue"></div>
		<div class="bubble bubble_light_blue"></div>
	</div>
	
	<!--<div id="auth">
		<script src="settings.js"></script>
		
		<div class="main-wrap">
			<div class="logo"><img src="images/logo.png" alt="QuickBlox logo" /></div>
			<div class="welcome">Welcome to<br />QB Group Chat Room (XMPP)</div>
			
			<div id="buttons">
				<p><button onclick="authQB()"><img src="images/login_quickblox.png" alt="Sign in with QuickBlox" /></button></p>
				<p><button onclick="authFB()"><img src="images/login_facebook.png" alt="Sign in with Facebook" /></button></p>
				<p><button onclick="authTW()" style="display:none"><img src="images/login_twitter.png" alt="Sign in with Twitter" /></button></p>
			</div>
			
			<form id="qb_login_form" action="#">
				<p><input id="login" type="text" placeholder="Login or Email" /></p>
				<p><input id="password" type="password" placeholder="Password" /></p>
				<p><button onclick="sessionCreate(); return false;">Connect</button>
					<span>Not registered yet?<br />
						<a href="#" id="signup">Register an account QuickBlox</a>
					</span>
				</p>
			</form>
			
			<form id="qb_signup_form" action="#" enctype="multipart/form-data">
				<p><input id="full_name_signup" type="text" placeholder="Full Name" /></p>
				<p><input id="email_signup" type="text" placeholder="Email" /></p>
				<p><input id="login_signup" type="text" placeholder="Login" /></p>
				<p><input id="password_signup" type="text" placeholder="Password" /></p>
				<div class="fileUpload">
					<input id="avatar_signup" type="file" size="8" accept="image/*" />
					<input class="fileName" type="text" placeholder="Avatar" />
					<img src="images/upload_photo.png" alt="upload" />
				</div>
				<p><button onclick="userCreate(); return false;">Sign Up</button></p>
			</form>
			
			<span class="success_reg">Thanks for your registration!</span>
		</div>
		
		<div class="powered">Powered by <a href="http://quickblox.com">QuickBlox</a></div>
		<div class="version"><?php echo $version; ?></div>
	</div>-->
	
	<div id="connecting">
		<p>Connecting. Please wait...</p>
		<p><img src="images/connecting.gif" alt="connecting" /></p>
	</div>
	
	<div id="chat">
		<header class="chat-header">
			<div class="occupants">
				<span class="number"></span>
				<img src="images/icon_users.png" alt="users" />
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
	</div>
	
	<script src="js/quickblox.js"></script>
	<script src="js/strophe.js"></script>
	<script src="js/strophe.muc.js"></script>
	<script src="js/jquery.base64.min.js"></script>
	<script src="js/jquery.formatDateTime.js"></script>
	<script src="js/jquery.scrollTo-min.js"></script>
	<script src="js/parseUri.js"></script>

	<script src="smiles.js"></script>
	<script src="xmppchat.js"></script>
</body>
</html>
