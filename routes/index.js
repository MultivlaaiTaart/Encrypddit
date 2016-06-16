var express = require('express');
var router = express.Router();
var pg = require("pg")  
var port = 8081;  
var host = '127.0.0.1';  
var conString = "pg://postgres:postgres@localhost:5432/Reg"; // spannende credentials
var crypto = require('crypto');
var title = "Encrypddit"

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: title });
});

router.post('/', function(req, res, next) {
	var user = req.body.Username
	var pass = req.body.Pass
	var msg = req.body.Message

	const cipher = crypto.createCipher('aes256', pass);
	var encrypted = '';

	cipher.on('readable', () => {
  		var data = cipher.read();
  		if (data)
    	encrypted += data.toString('hex');
	});

	cipher.on('end', () => {
		var client = new pg.Client(conString);
  		client.connect();

  		client.query("insert into secrets.messages values ('"+user+"','"+encrypted+"') on conflict (\"Username\") do update set \"Username\" = '"+user+"', \"Message\" = '"+encrypted+"'");

  		res.render('index', { title: title, message:'We encrypted it reddit!'});
	});

	cipher.write(msg);
	cipher.end();

})

router.post('/decrypt', function(req, res, next) {
	var user = req.body.Username
	var pass = req.body.Pass

	const decipher = crypto.createDecipher('aes256', pass);

	var decrypted = '';
	decipher.on('readable', () => {
  		var data = decipher.read();
  		if (data)
  			decrypted += data.toString('utf8');
	});

	decipher.on('end', () => {
		res.render('decrypt', { title: 'Decrypted' , contents: decrypted});
	});


	var client = new pg.Client(conString);
  	client.connect();

  	var query = client.query('SELECT * FROM secrets.messages WHERE "Username" = \'' +user+'\'');
  		query.on("row", function (row, result) {
    	result.addRow(row);
  	});

	query.on("end", function (result) {
		var encrypted = result.rows;

		if (Object.keys(encrypted).length == 1) {
			try {
				decipher.write(encrypted[0].Message, 'hex');
				decipher.end();
			} catch(ex){
				res.render('index', { title: title , message: 'Bad password'});
			}
		} else {
			res.render('index', { title: title , message: 'User not found'});
		}
  	});
	
})

router.get('/leak', function(req, res, next) {  
var client = new pg.Client(conString);
  client.connect();


  var query = client.query("SELECT * FROM secrets.messages");
  query.on("row", function (row, result) {
    result.addRow(row);
  });

	query.on("end", function (result) {

    res.render('leak', { title: 'Raw database contents, oops!' , contents: result.rows});
  });

});


module.exports = router;
