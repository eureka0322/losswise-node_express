var express = require('express');
var router = express.Router();
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var logger = require("./logger");
var dotenv = require('dotenv');
var api = require('./api');
var db = api.db;

dotenv.load();


router.get('/:inviteId', ensureLoggedIn, function(req, res, next) {
  var invite_id = req.params.inviteId;
  var user_id = req.user.id;
  if (!user_id || !invite_id) {
    logger.warn("Missing user_id or invite_id!");
    res.redirect('/dashboard');
  }
  db.task('accept-invite-task', t=> {
      return t.any("INSERT INTO users_organizations (user_id, organization_id) select ${user_id}, invites.organization_id FROM invites WHERE id=${invite_id}",
      { invite_id, user_id })
      .then((data) => { console.log('deleting invite....'); return t.any("DELETE FROM invites WHERE id=${invite_id}", { invite_id }); });
    })
    .then((data) => {
      // TODO: delete row from invites
      console.log(data);
      logger.info("Invite succeeded");
      res.redirect('/dashboard');
    })
    .catch(err => {
      // TODO: return useful error msg
      logger.warn(err);
      logger.warn("Invite failed!");
      res.redirect('/dashboard');
    });
});


module.exports = router;
