//console.log("Hello");
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const flash = require('connect-flash');
//Set up express app
const app = express();
app.use(express.static(__dirname+'/app'));
app.use('/quiz', express.static(__dirname + '/app'));
const mongoose = require('mongoose');
const session = require('express-session');
var cookieParser = require('cookie-parser');
const passport = require('passport');
const bodyParser = require('body-parser');
const shortid = require('shortid');

//Connect to mongoose
mongoose.connect('mongodb://localhost/interviewdb');
mongoose.Promise = global.Promise;

const TestModel = require('./app/models/tests');
const QuizModel = require('./app/models/questions');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true})); 
app.use(flash());
require('./app/config/passport')(passport);
app.use(cookieParser('secret'));
app.use(session({
    secret: 'shhsecret',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 60000,
        secure: false
    }
}));
app.use(passport.initialize());
app.use(passport.session());

const emailauth = require('./auth');

app.get('/auth/google',
  passport.authenticate('google',  { scope: 
  	['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/failure', successReturnToOrRedirect: '/', }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log(req);
    res.redirect('/success');
  });

app.post('/invite',function(req,res){
   
   
    let transporter= nodemailer.createTransport({
        service: "Gmail",
    auth: {
        user: emailauth.email, // service is detected from the username
        pass: emailauth.password
        }
    });

    let shortidgen = shortid.generate();

    let mailOptions = {
        from: '"Sarthak Langde" <sarthak.langde@gmail.com>', // sender address
        to: req.body.email, // list of receivers
        subject: 'Interview Invite Link', // Subject line
        text: "Click this link for interview", // plain text body
        html: '<a href="http://localhost:3000/url/'+shortidgen+'">Click to take the test or view score</a>' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        } else {
            let newtest = new TestModel();
            newtest.url = shortidgen;
            newtest.email = req.body.email;

            newtest.save(function(err) {
				if (err)
				throw err;
			});
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
    res.sendStatus(200);

});
app.get('/',function(req,res){
    if(req.user){
		res.redirect('/admin');
	}else{
		res.sendFile(__dirname + '/app/home.html');
	}
});

app.get('/listinvite',function(req,res){
    TestModel.find({},function(err,results){
        if(!err){
            res.send(results);
        }
    });
});

// app.post('/login',function(req,res){
//     console.log(req.body);
// });
app.post('/login', passport.authenticate('local', 
    { successRedirect : '/admin', // redirect to the secure profile section
        failureRedirect : '/', // redirect back to the signup page if there is an error
        failureFlash : true }),
  function(req, res) {
    //console.log(req.body);
    res.redirect('/');
});

app.get('/questions', function(req,res){
    QuizModel.findRandom({}, {}, {limit: 5}, function(err, results) {
        if (!err) {
           res.send(results); // 5 elements 
        }
    });
});

app.get('/status/:urlid',function(req,res){

    TestModel.findOne({url: req.params.urlid},function(err, result){
        if(!err){
            res.send(result);
        }
    });
});

app.get('/quiz/:urlid',isLoggedIn, function(req,res){
    console.log(path.join(__dirname,'/app/quiz.html'));
    res.sendFile(path.join(__dirname,'/app/quiz.html'));
   
});
    
app.put('/quiz/:urlid', function(req,res){
    TestModel.update({url: req.params.urlid},{$set: {status: 1, score: req.body.score}}, function(){
        console.log("Scores Updated");
    });
    // QuizModel.findOneAndUpdate({url: req.params.urlid},{
    //     url: req.params.urlid
    // })
    res.sendStatus(200);
   
});

//app.get('/auth/google',  passport.authenticate('google',  { scope:   	['profile', 'email'] }));

app.get('/url/:urlid', function(req, res, next) {
    console.log("ABCDEF",req.params.urlid);
    if(!req.user){
        req.session.returnTo = "/url/"+req.params.urlid;
        passport.authenticate('google', { scope:['profile', 'email'] }, function(err, user, info) {
            if (err) { return next(err); }
            if (!user) { return res.redirect('/url/'+urlid); }
            req.logIn(user, function(err) {
            if (err) { return next(err); }
            return res.redirect('/apple');
            });
        })(req, res, next);
    }
    else{
        res.redirect('/quiz/'+req.params.urlid);
    }    
  
});


// app.get('/url/:urlid',function(req,res){
//     res.end();
// });

app.get('/admin',function(req,res){
    res.sendFile(__dirname+'/app/admin.html');
});

app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/');
});

app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/');
});

app.listen(process.env.PORT || 3000, function () {
	console.log("Listening on port...");
});



function isLoggedIn(req, res, next) {  
  if (req.isAuthenticated())
      return next();
  
  res.redirect('/');
}