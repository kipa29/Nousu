var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session');
var crypto = require('crypto');
var cookieParser = require('cookie-parser');

var app = express();

var secret_key = 'secret key';

app.use(session({
	secret: secret_key,
	resave: true,
	saveUninitialized: true
}));

app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.set('view engine', 'ejs');//Set view engine to EJS
app.use('/assets', express.static('assets'));//let use static files

//Set index page
app.get('/', function(req, res) {
    res.render('index');
});

//Set palvelut page
app.get('/palvelut', function(req, res) {
    res.render('palvelut');
});

//Set refe page
app.get('/refe', function(req, res) {
    res.render('refe');
});

//Set contact page
app.get('/contact', function(req, res) {
    res.render('contact');
});

//Contact form handling POST method
app.post('/contact', function(req, res) {
    // Create variables and set to the post data
    var nettisivut = req.body.nettisivut;
    var valokuvaus = req.body.valokuvaus;
    var assistentti = req.body.assistentti;
    var viesti = req.body.viesti;
    var nimi = req.body.contactName;
    var yhteystiedot = req.body.contact;

    //Check if all checkboxes and textarea is empty on submit button
    if(nettisivut == null && valokuvaus == null && assistentti == null && viesti == '') {
        console.log('Et klikannut mitään.');
        res.send('Valitsethan palvelun tai kirjoita vapaamuotoinen viesti. Kiitos.');
    }
    //Check if contact information is empty
    else if (nimi == '' || yhteystiedot == '') {
        console.log('Jätä yhteystiedot!');
        res.send('Jätä yhteystiedot');
    }
    else {
        //Create connection to database
        var conn = mysql.createConnection({
            host: "localhost",
            user: "asiakas",
            password: "Salasana123",
            database: "nousu"
        });
        conn.connect(function(err) {
            if (err){
                throw err;
            } 
            console.log("Connected to database demo!");
        });
        //Insert data to database after successful connection
        conn.query("INSERT INTO varaus (yhteyshenkilo, yhteystiedot, nettisivut, valokuvaus, markkinointiassistentti, viesti, date) VALUES (?, ?, ?, ?, ?, ?, CURDATE())", [nimi, yhteystiedot, nettisivut, valokuvaus, assistentti, viesti], function (err, result) {
            if (err) throw err;
            console.log("Number of record inserted: " + result.affectedRows);
        });
        //Redirect to the thank you
        res.redirect('/kiitos');
    }
    conn.end();//Close connection to database
});

//GET kiitos page
app.get('/kiitos', function(req, res) {
    res.render('kiitos');
});

//GET evasteet page
app.get('/evasteet', function(req, res) {
    res.render('evasteet');
});

//Portal nousu page
app.get('/nousu.portal', function(req, res) {
    res.render('portal');
});

//Portal register page
app.get('/nousu.portal/register', function(req, res) {
    res.render('register');
});

//Portal register POST
app.post('/register', function(req, res) {
    // Create variables and set to the post data
    var username = req.body.username;
    var password = req.body.password;
    var confPwd = req.body.conPassword;
    var hashed_password = crypto.createHash('sha1').update(req.body.password).digest('hex');

    //Connection to the nousu database
    const conn = mysql.createConnection({
        connectionLimit: 10,
        host: 'localhost',
        user: 'tjNousu',
        password: 'nousu123',
        database: 'nousu'
    });
    conn.connect(function(err) {
        if (err){
            throw err;
        } 
        console.log("Connected to database nousu from nousu.portal.");
    });

    //Check if the post data exist and not empty
    if(username && password && confPwd) {
        // Check if account exists already in the accounts table, checks for username but you could change this to email etc
        conn.query('SELECT * FROM portaluser WHERE kayttaja = ?', [username], function(error, results, fields) {
            if(results.length > 0) {
                res.send('Käyttäjätunnus on jo olemassa!');
				res.end();
            }
            //Check password confirm
            else if(password != confPwd) {
                console.log('Password not matching!');
                res.send('Password not mathing!');
                return;
            }
            else if(!/[A-Za-z0-9]+/.test(username)) {
                // Username validation, must be numbers and characters
				response.send('Username must contain only characters and numbers!');
				response.end();
            }
            else {
				// Insert account with no activation code
				conn.query('INSERT INTO portaluser (kayttaja, salasana) VALUES (?, ?)', [username, hashed_password], function(error, results, fields) {
					res.render('portal');
					res.end();
				});
			}
        })
    }
    else {
        // Form is not complete...
		res.send('Please complete the registration form!');
		res.end();
    }
});

//Portal login POST
app.post('/login', function(request, response) {
    var username = request.body.name;
    var password = request.body.password;
    var hashed_password = crypto.createHash('sha1').update(request.body.password).digest('hex');

    //dbConnection
    const conn = mysql.createConnection({
        connectionLimit: 10,
        host: 'localhost',
        user: 'tjNousu',
        password: 'nousu123',
        database: 'nousu'
    });
    conn.connect(function(err) {
        if (err){
            throw err;
        } 
        console.log("Connected to database nousu from nousu.portal.");
    });

    // check if the data exists and is not empty
	if (username && password) {
		// Select the account from kayttaja table
		conn.query('SELECT * FROM portaluser WHERE kayttaja = ? AND salasana = ?', [username, hashed_password], function(error, results, fields) {
			if (results.length > 0) {
				// Account exists (username and password match)
				// Create session variables
				request.session.loggedin = true;
                request.session.username = username;
				// Redirect to home page
				response.redirect('/nousu.portal/home');
				response.end();
			} else {
				response.send('Incorrect Username and/or Password!');
				response.end();
			}
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

//nousu home page
app.get('/nousu.portal/home', function(request, response) { 
    //dbConnection
    const conn = mysql.createConnection({
        connectionLimit: 10,
        host: 'localhost',
        user: 'tjNousu',
        password: 'nousu123',
        database: 'nousu'
    });

    var sql = "SELECT * FROM varaus";
    conn.query(sql, function(error, result, fields) {
        if(error) throw error;
        // Check if user is logged in
        if (request.session.loggedin) {
            // Render home page with the result from varaus table and kayttaja table
            response.render('home', { username: request.session.username,
            data: result });
        } 
        else {
            // Redirect to login page
            response.redirect('/nousu.portal');
        }
    }) 
    
});

//DELETE FROM varaus (portal/home)
app.post('/delete_data', function(request, response) {
    //Select id
    var id = request.body.id;
    
    //dbConnection
    const conn = mysql.createConnection({
        connectionLimit: 10,
        host: 'localhost',
        user: 'tjNousu',
        password: 'nousu123',
        database: 'nousu'
    });

    //Delete
    conn.query('DELETE FROM varaus WHERE id = ?', [id], function(err, result) {
        if (err) throw err;
        console.log("Number of records deleted: " + result.affectedRows);
        response.redirect('/nousu.portal/home');
        response.end();
    })
});

//Logout
app.get('/logout', function(request, response) {
	// Destroy session data
	request.session.destroy();
	// Redirect to login page
	response.redirect('/nousu.portal');
});

//Errors: page not found 404
app.use((req, res, next) => {
    var err = new Error('Page not found. 404 Error.');
    err.status = 404;
    next(err);
});

//handling errors
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.send(err.message);
});

console.log('Lopputyön app kuuntelee porttia 3000!');
app.listen(3000);