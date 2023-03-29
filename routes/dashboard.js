var express = require('express');
var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var logger = require('./logger');
var router = express.Router();
var api = require('./api');
var common = require('./common');
var db = api.db;


router.get('/', ensureLoggedIn, function(req, res, next) {
  db.task('get-everything', t => {
    return t.batch([
      t.any('SELECT org.created_user_id AS created_user_id, org.id AS org_id, org.name AS org_name, proj.* ' +
            'FROM organizations org INNER JOIN users_organizations u_o ON org.id = u_o.organization_id ' +
            'FULL OUTER JOIN projects proj ON u_o.organization_id=proj.organization_id WHERE u_o.user_id=$1 ' +
            'ORDER BY proj.created_at DESC',
            [req.user.id]),
      t.any('SELECT * FROM users WHERE id=$1', [req.user.id])
    ]);
  })
  .then(function(data) {
    var userInfo = data[1] && JSON.stringify(data[1]);
    res.render('user', {
      user: req.user,
      title: 'Dashboard',
      projects: JSON.stringify(data[0]),
      userInfo: userInfo
    });
  })
  .catch(function (err) {
    logger.warn("User not found...");
    logger.warn(err);
  });
});

module.exports = router;
