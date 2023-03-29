var express = require('express');
var passport = require('passport');
var router = express.Router();
var path = require('path');
var ensureLoggedOut = require('connect-ensure-login').ensureLoggedOut('/dashboard');


var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
};

router.get('/', function(req, res) {
  res.sendFile('index.html', { root: "public/html/"});
});

router.get('/login', function(req, res) {
  res.render('login', { env: env });
});

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

router.get('/callback',
  passport.authenticate('auth0', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect(req.session.returnTo || '/dashboard');
});


module.exports = router;
