var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var dotenv = require('dotenv');
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');
var { app, server, redisClient } = require('./io');

dotenv.load();

var logger = require('./routes/logger');
var index = require('./routes/index');
var dashboard = require('./routes/dashboard');
var invite = require('./routes/invite');
var port = process.env.PORT || 3000;
var api = require('./routes/api');

// This will configure Passport to use Auth0
var strategy = new Auth0Strategy({
    domain:       process.env.AUTH0_DOMAIN,
    clientID:     process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:  process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
  }, function(accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  });

passport.use(strategy);

// you can use this section to keep a smaller payload
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


// optionall use webpack middleware for debugging
if (app.get('env') === 'development') {
  logger.info('Using webpack reloader.');
  var webpack = require('webpack');
  var webpackDevMiddleware = require('webpack-dev-middleware');
  var webpackHotMiddleware = require('webpack-hot-middleware');
  var webpackConfig = require('./webpack-dev.config');
  var compiler = webpack(webpackConfig);
  app.use(webpackDevMiddleware(compiler, {
    noInfo: false,
    publicPath: webpackConfig.output.publicPath,
    stats: webpackConfig.stats
  }));
  app.use(webpackHotMiddleware(compiler));
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  store: new RedisStore({client: redisClient}),
  cookie: {expires: new Date(253402300000000)},
  secret: 'shhhhhhhhh',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/invites', invite);
app.use('/api/v1', api.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', index);
app.use('/*', dashboard);
app.use('/*', dashboard);
app.use('/*', dashboard);
app.use('/*', dashboard);
app.use('/*', dashboard);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  logger.error(err);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

server.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;
  logger.info("Example app listening at http://%s:%s", host, port);
});
