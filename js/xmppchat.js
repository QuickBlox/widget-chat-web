$(document).ready(function() {
	getToken();
});

function getToken() {
	QB.init(3907, 'jRVze-6OzVDh-WX', 'uX8dZDexGW8TrEe');
	
	QB.createSession({login: 'anryogo', password: 'injoit00'}, function(err, result){
		if (err) {
			console.log('Something went wrong: ' + err);
		} else {
			console.log(result);

			QB.users.listUsers(function(err, result){
				if (err) {
					console.log('Something went wrong: ' + err);
				} else {
					console.log(result);
					for (var i=0; i < result.items.length; i++) {
					   console.log('User ' + result.items[i].user.login + ' is registered');
					}
				}
			});
		}
	});
}