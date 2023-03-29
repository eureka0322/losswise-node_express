var express = require('express');
var router = express.Router();
var cors = require('cors');
var promise = require('bluebird');
var rq = require('superagent-bluebird-promise');
var crypto = require("crypto");
var logger = require("./logger");
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
var dotenv = require('dotenv');
var PubNub = require('pubnub');
var moment = require('moment');
var common = require('./common');
var mailgun = require('mailgun-js')({apiKey: 'key-32a3c867462f9134fcda8a88d8233adf', domain: 'mg.losswise.com'});

var pubnub = new PubNub({
  // TODO: add these to env vars
  publishKey : 'pub-c-f7f2de92-3c9f-46ac-b5c1-3ae3934a2b47',
  subscribeKey : 'sub-c-849258a2-8917-11e7-9760-3a607be72b06'
});

dotenv.load();

var options = {
  promiseLib: promise
};

// connect to database
var pgp = require('pg-promise')(options);
var connectionString = 'postgres://' + process.env.RDS_USERNAME + ':' + process.env.RDS_PASSWORD +
                       '@' + process.env.RDS_HOSTNAME + ':' + process.env.RDS_PORT + '/' +
                       process.env.RDS_DB_NAME;
var db = pgp(connectionString);

// TODO: put all timer code in timer.js file
// Update API keys every 10 seconds for new API keys
global.KEY_TO_ID_MAP = {};
function resetUsers() {
  db.any('SELECT * FROM projects')
    .then(function(data) {
      for (var idx = 0; idx < data.length; idx++) {
        var project = data[idx]
        global.KEY_TO_ID_MAP[project.api_key] = project.id;
      }
    });
}
resetUsers();
setInterval(resetUsers, 10000);

function sendNotification(webHookUrl, data) {
  rq.post(webHookUrl)
  .set('Content-Type', 'application/json')
  .send(JSON.stringify(data))
  .then(function(res) {
    console.log(res.text);
  }).catch(function(e) {
    console.log(e);
  });
}

function sendNotificationsForSession(session_id, is_success) {
  db.any('SELECT notifications.info AS notification_info, organizations.name AS org_name, ' +
         'projects.name AS project_name, sessions.stats AS stats, ' +
         'sessions.created_at AS created_at, sessions.modified_at AS modified_at, ' +
         'sessions.tag AS tag FROM notifications, projects, sessions, organizations ' +
         'WHERE notifications.project_id=projects.id ' +
         'AND projects.id=sessions.project_id ' +
         'AND organizations.id=projects.organization_id AND sessions.id=${session_id}',
         { session_id })
    .then((d) => {
      if (d.length > 0) {
        d.map((elem) => {
          if (elem.notification_info) {
            var { org_name, project_name, tag, created_at,
                  modified_at, notification_info, stats } = elem;
            var dateModifiedMoment = moment(modified_at || created_at);
            var dateCreatedMoment = moment(created_at);
            var elapsed = dateModifiedMoment.diff(dateCreatedMoment, 'seconds');
            var elapsedStr = "";
            // calculate (and subtract) whole days
            var days = Math.floor(elapsed / 86400);
            elapsed -= days * 86400;
            if (days > 0) elapsedStr = days + "d";
            var hours = Math.floor(elapsed / 3600) % 24;
            elapsed -= hours * 3600;
            if (hours > 0) elapsedStr = elapsedStr + " " + hours + "h";
            var minutes = Math.floor(elapsed / 60) % 60;
            elapsed -= minutes * 60;
            elapsedStr = elapsedStr + " " + minutes + "m";
            var attachmentText = `Duration: ${elapsedStr}`;
            if (is_success) {
              var data = { "text": `<http://losswise.com/${org_name}/${project_name}|[${org_name}/${project_name}:${tag}]> Session complete` };
              data.attachments = [{"color": "good", "mrkdwn_in": ["text", "pretext"]}];
              Object.keys(stats).forEach(function(graphId) {
                var statsGraph = stats[graphId];
                Object.keys(statsGraph).forEach(function(trackedName) {
                  if (trackedName === 'x' || trackedName === 'xper') {
                    return;
                  }
                  var nameStats = statsGraph[trackedName];
                  Object.keys(nameStats).forEach(function(kind) {
                    var nameNew = kind + "(*" + trackedName + "*)";
                    var value = nameStats[kind];
                    attachmentText += `\n${nameNew}: ${value.toFixed(5)}`;
                  });
                });
              });
              data.attachments[0].text = attachmentText;
              sendNotification(notification_info.incoming_webhook.url, data);
            } else {
              var data = { "text": `<http://losswise.com/${org_name}/${project_name}|[${org_name}/${project_name}:${tag}]> Session cancelled` };
              data.attachments = [{"text": attachmentText, "color": "danger", "mrkdwn_in": ["text", "pretext"]}];
              sendNotification(notification_info.incoming_webhook.url, data);
            }
          }
        })
      }
    })
    .catch(err => {
      logger.error("Failed server request!");
      logger.error(err);
    });
}

function findCancelled() {
  db.any("SELECT * FROM sessions WHERE status='active' AND modified_at < NOW() - INTERVAL '1 minute'")
    .then(function(data) {
      if(data.length > 0) {
        for (var idx = 0; idx < data.length; idx++) {
          var session_id = data[idx].id;
          var project_id = data[idx].project_id;
          var modified_at = data[idx].modified_at;
          logger.info('Updating dead session_id: ' + session_id);
          pubnub.publish({
            channel: project_id,
            message: {
              eventType: 'onSessionUpdate',
              session_id: session_id,
              modified_at: modified_at,
              status: "cancelled"
            }
          });
          sendNotificationsForSession(session_id, false);
        }
      }
    })
    .then(function() {
      db.any("UPDATE sessions SET status='cancelled' WHERE status='active' AND modified_at < NOW() - INTERVAL '1 minute'")
        .then(function(data) {
          logger.info('Updated dead sessions.');
        });
    })
    .catch(function(err) {
      logger.error(err);
      console.trace();
    });
}

setInterval(findCancelled, 20000);


router.post('/graphs', cors(), function (req, res, next) {
  var graph_id = crypto.randomBytes(10).toString('hex');
  var api_key = req.header('authorization');
  if (api_key === undefined) {
    res.json({'success': false, 'error': 'Missing API credentials.', 'graph_id': ''});
    return;
  }
  var project_id = global.KEY_TO_ID_MAP[api_key];
  if (project_id !== undefined) {
    db.none('INSERT INTO graphs (id, project_id, session_id, title, xlabel, ylabel, kind) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [graph_id, project_id, req.body.session_id, req.body.title,
             req.body.xlabel, req.body.ylabel, req.body.kind])
      .then(res.status(200).json({'success': true, 'error': '', 'graph_id': graph_id}))
      .then(function() {
        pubnub.publish({
          channel: project_id,
          message: {
            eventType: 'onGraphNew',
            id: graph_id,
            session_id: req.body.session_id,
            title: req.body.title,
            xlabel: req.body.xlabel,
            ylabel: req.body.ylabel,
            kind: req.body.kind,
            max_iter: req.body.max_iter,
          }
        });
      })
      .catch(function (err) {
        logger.error(err);
        console.trace();
        res.json({'success': false, 'error': 'Invalid request parameters.', 'graph_id': ''});
        return;
      });
  } else {
    res.json({'success': false, 'error': 'Invalid API credentials.', 'graph_id': ''});
  }
});


router.post('/users', ensureLoggedIn, function(req, res, next) {
  // creates user + organization
  var user_name = req.body.user_name;
  var user_email = req.body.user_email;
  var user_id = req.user.id;
  logger.info("Creating new user...");
  if (!user_email || !user_id) {
    logger.warn('missing user information');
    res.status(200).json({'success': false, 'err': 'Missing parameters!'});
    return;
  }
  // TODO: handle duplicate organization names
  db.one('INSERT INTO users (id, name, email) VALUES (${user_id}, ${user_name}, ${user_email}) RETURNING *',
         { user_id, user_name, user_email })
    .then((data) => {
      logger.info("Created new user!");
      res.status(200).json({'success': true, data: data});
    })
    .catch(err => {
      logger.error("Create organization failed!");
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Failed to create organization.'});
    });
});


// TODO: break this up into two API calls
router.post('/user-org-project', ensureLoggedIn, function(req, res, next) {
  // creates user + organization
  var organization_name = req.body.organization_name;
  var project_name = req.body.project_name;
  var user_name = req.body.user_name;
  var user_email = req.body.user_email;
  var user_id = req.user.id;
  var api_key = common.genApiKey();
  logger.info("Creating new user...");
  if (!organization_name || !project_name || !user_email || !user_id) {
    logger.warn('missing user information');
    res.status(200).json({'success': false, 'err': 'Missing parameters!'});
    return;
  }
  // TODO: handle duplicate organization names
  db.one('WITH user_new AS (INSERT INTO users (id, name, email) ' +
    'VALUES (${user_id}, ${user_name}, ${user_email}) RETURNING *), ' +
    'organization AS (INSERT INTO organizations (name, created_user_id) ' +
    'VALUES (${organization_name}, ${user_id}) RETURNING *), ' +
    'user_organization AS (INSERT INTO users_organizations (user_id, organization_id) ' +
    'SELECT ${user_id}, organization.id FROM organization), ' +
    'project AS (INSERT INTO projects (name, created_user_id, api_key, organization_id) ' +
    'SELECT ${project_name}, ${user_id}, ${api_key}, organization.id FROM organization RETURNING *) ' +
    'SELECT user_new.email AS user_email, user_new.name AS user_name, project.api_key AS api_key, organization.name AS org_name, ' +
    'organization.id AS org_id,project.id AS project_id, project.name AS project_name FROM organization, project, user_new',
    { user_id, user_name, project_name, user_email, organization_name, project_name, api_key })
    .then((data) => {
      logger.info("Created new user!");
      res.status(200).json({'success': true, data: data});
    })
    .catch(err => {
      logger.error("Create organization failed!");
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Failed to create organization.'});
    });
});


router.get('/notifications/:projectId', ensureLoggedIn, function(req, res, next) {
  // TODO: check user has access to project
  var project_id = req.params.projectId;
  if (!project_id || project_id === null) {
    logger.info("Returning error!");
    res.status(200).json({'success': false, 'err': "Project not specified."});
    return;
  }
  db.any('SELECT * FROM notifications WHERE project_id=${project_id}',
    { project_id })
    .then((data) => {
      res.status(200).json({'success': true, 'data': data});
    })
    .catch(err => {
      logger.error("Failed server request!");
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Failed request.'});
    });
});

router.delete('/notifications/:notificationId', ensureLoggedIn, function(req, res, next) {
  var notificationId = req.params.notificationId;
  db.one('DELETE FROM notifications WHERE id=${notificationId}',
    {notificationId})
    .then(function(data) {
      res.status(200).json({'success': true, 'data': data});
    })
    .catch(function(err) {
      logger.error(err);
      res.status(200).json({'success': false});
    });
});

router.get('/invites/:organizationId', ensureLoggedIn, function(req, res, next) {
  logger.info("Getting invites...");
  var organization_id = req.params.organizationId;
  if (!organization_id) {
    logger.info("Returning error!");
    res.status(200).json({'success': false, 'err': "Organization not specified."});
    return;
  }
  db.any('SELECT * FROM invites WHERE organization_id=${organization_id}',
    { organization_id })
    .then((data) => {
      res.status(200).json({'success': true, 'data': data});
    })
    .catch(err => {
      logger.error("Failed server request!");
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'No invites found.'});
    });
});


router.delete('/invites/:inviteId', ensureLoggedIn, function(req, res, next) {
  var inviteId = req.params.inviteId;
  logger.info("Delete invites called");
  db.any('DELETE FROM invites WHERE id=${inviteId}',
    { inviteId })
    .then((data) => {
      logger.info("Delete invites success!");
      res.status(200).json({'success': true});
    })
    .catch(err => {
      logger.warn(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Invite specified not found.'});
    });
});


router.post('/invites', ensureLoggedIn, function(req, res, next) {
  logger.info("Updating invites...");
  var invite_id = common.genInviteId();
  var organization_id = req.body.organization_id;
  var organization_name = req.body.organization_name;
  var inviter_name = req.body.inviter_name;
  var email = req.body.email;
  // TODO: include user's name and organization's name in welcome email
  if (!email || !organization_id || !inviter_name || !organization_name) {
    logger.warn("Missing email or organization_id!");
    res.status(200).json({'success': false, 'err': "Must provide valid email and valid organization!"});
    return;
  }
  db.one('INSERT INTO invites (id, organization_id, email) ' +
         'VALUES (${invite_id}, ${organization_id}, ${email}) RETURNING *',
         { invite_id, organization_id, email })
    .then((data) => {
      var emailData = {
        from: 'Losswise <support@losswise.com>',
        to: email,
        subject: 'Losswise invitation',
        text: `You have been invited to join ${organization_name} at losswise.com by ${inviter_name}.\n` +
          'Simply visit the following URL to join: https://losswise.com/invites/' + data.id
      };
      mailgun.messages().send(emailData, function (error, body) {
        logger.info(body);
      });
      logger.info("New invite: " + data);
      res.status(200).json({'success': true, 'data': data});
    })
    .catch(err => {
      logger.warn(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Failed to create invite.'});
    });
});


router.get('/organizations/:organizationId/people', ensureLoggedIn, function(req, res, next) {
  var organization_id = req.params.organizationId;
  db.any('SELECT users.email AS email, users.name AS name, users.id AS id FROM users_organizations ' +
         'INNER JOIN users ON users_organizations.user_id=users.id WHERE organization_id=${organization_id}',
         { organization_id })
    .then((data) => {
      logger.info(data);
      res.status(200).json({'success': true, data: data});
    })
    .catch((err) => {
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Failed to fetch organization.'});
    });
});


router.delete('/organizations/:organizationId/people/:userId', ensureLoggedIn, function(req, res, next) {
  var organization_id = req.params.organizationId;
  var user_id = req.params.userId;
  if (!user_id || !organization_id) {
    res.status(200).json({'success': false, 'err': 'Missing org id or user id!'});
  }
  db.any('DELETE FROM users_organizations WHERE user_id=${user_id} AND organization_id=${organizationId}',
    { user_id, organization_id })
    .then((data) => {
      logger.info(data);
      res.status(200).json({'success': true, data: data});
    })
    .catch((err) => {
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Organization not found!'});
    });
});


router.patch('/organizations/:organizationId', ensureLoggedIn, function(req, res, next) {
  logger.info("Updating organization info...");
  var organization_id = req.params.organizationId;
  var nameNew = req.body.organization_name;
  if (!nameNew) {
    logger.warn("Missing organization name!");
    res.status(200).json({'success': false, 'err': 'Missing project name.'});
  }
  db.one('UPDATE organizations SET (name) = ($1) WHERE id=$2 RETURNING name',
         [nameNew, organization_id])
    .then(data => {
      res.status(200).json({'success': true, data: {organization_name: data.name}});
      logger.info('Rename success: ' + data.name);
    })
    .catch(err => {
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Unable to find organization!'});
    });
});


router.post('/projects', ensureLoggedIn, function(req, res, next) {
  // TODO: check that organization ID is legit
  var api_key = common.genApiKey();
  var organization_id = req.body.organization_id;
  var project_name = req.body.project_name;
  if (!project_name || !organization_id) {
    res.status(200).json({'success': false, 'err': 'Must supply valid project_name and organization_id value!'});
  }
  db.one("WITH project AS (INSERT INTO projects (name, created_user_id, api_key, organization_id) " +
         "VALUES ($1, $2, $3, $4) RETURNING *) SELECT * FROM project",
    [project_name, req.user.id, api_key, organization_id])
    .then(data => {
      res.status(200).json({'success': true, data: data});
    })
    .catch(err => {
      logger.error("Unable to create project.");
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Unable to create project.'});
    });
});


router.delete('/projects/:projectId', ensureLoggedIn, function(req, res, next) {
  // TODO: check user has legal access to project
  var projectId = req.params.projectId;
  if (!projectId) {
    res.status(200).json({'success': false, 'err': 'Missing project ID.'});
  }
  db.result("DELETE FROM projects WHERE id = $1", [projectId])
    .then(result => {
      res.status(200).json({'success': true});
    })
    .catch(err => {
      logger.error("Cannot delete project");
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': 'Cannot delete project.'});
    });
});


router.patch('/projects/:projectId', ensureLoggedIn, function(req, res, next) {
  var projectId = req.params.projectId;
  var nameNew = req.body.name;
  if (!nameNew) {
    res.status(200).json({'success': false, 'err': 'Missing project ID.'});
  }
  db.one('UPDATE projects SET (name) = ($1) WHERE id=$2 RETURNING name', [nameNew, projectId])
    .then(data => {
      res.status(200).json({'success': true, 'name': data.name});
      console.log('Rename success: ' + data.name);
    })
    .catch(err => {
      logger.error("Unable to update project");
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false, 'err': "Unable to find project."});
    });
});


router.post('/sessions', cors(), function (req, res, next) {
  var session_id = crypto.randomBytes(10).toString('hex');
  var api_key = req.header('authorization');
  if (api_key === undefined) {
    res.json({'success': false, 'error': 'Missing API credentials.', 'session_id': ''});
    return;
  }
  var project_id = global.KEY_TO_ID_MAP[api_key];
  var env = req.body.env || {};
  if (project_id !== undefined) {
    db.one('INSERT INTO sessions ' +
           '(id, project_id, tag, params, max_iter, status, env, created_at, modified_at) ' +
           'VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING created_at',
      [session_id, project_id, req.body.tag, req.body.params, req.body.max_iter, 'active', env])
      .then(function(data) {
        res.status(200).json({'success': true, 'error': '', 'session_id': session_id});
        pubnub.publish({
          channel: project_id,
          message: {
            eventType: 'onSessionNew',
            env: env,
            id: session_id,
            created_at: data.created_at,
            tag: req.body.tag,
            params: req.body.params,
            max_iter: req.body.max_iter,
            status: 'active',
            graphs: [],
          }
        });
      })
      .catch(function (err) {
        logger.error(err);
        console.trace();
        res.json({'success': false, 'error': 'Unable to create session.', 'session_id': ''});
      });
  } else {
    res.json({'success': false, 'error': 'Invalid API credentials.', 'session_id': ''});
  }
});

router.patch('/sessions/:sessionId', cors(), function (req, res, next) {
  var api_key = req.header('authorization');
  if (api_key === undefined) {
    res.json({'success': false, 'error': 'Missing API credentials.', 'session_id': ''});
    return;
  }
  var session_id = req.params.sessionId;
  var project_id = global.KEY_TO_ID_MAP[api_key];
  var status_new = req.body.attributes.status;
  if (project_id !== undefined) {
    db.one('UPDATE sessions SET (status, modified_at) = ($1, NOW()) ' +
           'WHERE id=$2 AND project_id=$3 RETURNING modified_at',
           [status_new, session_id, project_id])
      .then(data => {
        if (status_new == "complete") {
          pubnub.publish({
            channel: project_id,
            message: {
              eventType: 'onSessionUpdate',
              session_id: session_id,
              modified_at: data.modified_at,
              status: "complete"
            }
          });
          sendNotificationsForSession(session_id, true);
        }
        res.status(200).json({'success': true, 'error': ''});
      })
      .catch(function (err) {
        logger.error(err);
        console.trace();
        res.json({'success': false, 'error': 'Unable to find session.', 'session_id': ''});
      });
  } else {
    res.json({'success': false, 'error': 'Invalid API credentials.', 'session_id': ''});
  }
});

router.post('/points', cors(), function(req, res, next) {
  var x = req.body.x;
  var y = req.body.y;
  var session_id = req.body.session_id;
  var graph_id = req.body.graph_id;
  var api_key = req.header('authorization');
  if (api_key === undefined) {
    res.json({'success': false, 'error': 'Missing API credentials.'});
    return;
  }
  var project_id = global.KEY_TO_ID_MAP[api_key];
  if (project_id !== undefined) {
    db.one('INSERT INTO points (x, y, session_id, project_id, graph_id) ' +
           'VALUES ($1, $2, $3, $4, $5) RETURNING id',
           [x, y, session_id, project_id, graph_id])
      .then(function(data) {
        res.status(200).json({'success': true});
        pubnub.publish({
          channel: project_id,
          message: {
            eventType: 'onPointNew',
            x: x,
            y: y,
            session_id: session_id,
            graph_id: graph_id,
            id: data.id
          }
        });
      })
      .then(function() {
        if (Object.keys(req.body.stats).length > 0) {
          db.one('UPDATE sessions SET (stats, modified_at) = ' +
                 '(jsonb_set(stats, $1, $2, true), NOW()) WHERE id=$3 RETURNING modified_at, stats',
                 ["{" + graph_id + "}", req.body.stats, session_id])
            .then(function(data) {
              pubnub.publish({
                channel: project_id,
                message: {
                  eventType: 'onSessionUpdate',
                  graph_id: graph_id,
                  session_id: session_id,
                  stats: data.stats,
                  modified_at: data.modified_at
                }
              });
            });
        }
      })
      .catch(function (err) {
        logger.error(err);
        console.trace();
        res.json({'success': false, 'error': 'Unable to insert points.'});
      });
  } else {
    res.json({'success': false, 'error': 'Invalid API credentials.'});
  }
});


router.post('/point-list', cors(), function(req, res, next) {
  var point_list = req.body.point_list;
  var api_key = req.header('authorization');
  if (api_key === undefined) {
    res.json({'success': false, 'error': 'Missing API credentials.'});
    return;
  }
  if (point_list.length == 0) {
    logger.warn("Zero length point_list.");
    res.json({'success': true});
    return;
  }
  var project_id = global.KEY_TO_ID_MAP[api_key];
  if (project_id !== undefined) {
    var dataInsertList = point_list.map((elem) => {
        return {
          x: elem.x,
          y: elem.y,
          session_id: elem.session_id,
          graph_id: elem.graph_id,
          project_id: project_id
        };
    });
    var cs = new pgp.helpers.ColumnSet([
      'x',
      'y:json',
      'session_id',
      'project_id',
      'graph_id'
    ], {table: 'points'});
    var insert = pgp.helpers.insert(dataInsertList, cs);
    db.any(insert)
      .then(function(data) {
        res.status(200).json({'success': true});
        for (var idx = 0; idx < point_list.length; idx++) {
          var point = point_list[idx];
          pubnub.publish({
            channel: project_id,
            message: {
              eventType: 'onPointNew',
              x: point.x,
              y: point.y,
              session_id: point.session_id,
              graph_id: point.graph_id,
            }
          });
        }
      })
      .then(function() {
        if (Object.keys(req.body.stats_map).length > 0) {
          var pointLast = point_list[point_list.length - 1];
          var stats = pointLast.stats;
          var session_id = pointLast.session_id;
          var stats_map = req.body.stats_map;
          db.one('UPDATE sessions SET (stats, modified_at) = ' +
                 '(stats || $1, NOW()) WHERE id=$2 RETURNING modified_at, stats',
                 [stats_map, session_id])
            .then(function(data) {
              pubnub.publish({
                channel: project_id,
                message: {
                  eventType: 'onSessionUpdate',
                  session_id: session_id,
                  stats: data.stats,
                  modified_at: data.modified_at
                }
              });
            });
        }
      })
      .catch(function (err) {
        logger.error(err);
        console.trace();
        res.json({'success': false, 'error': 'Unable to insert points.'});
      });
  } else {
    res.json({'success': false, 'error': 'Invalid API credentials.'});
  }
});


router.get('/sessions/:projectId', ensureLoggedIn, function(req, res, next) {
  // TODO: are permissions ok here?
  db.any('SELECT sessions.*, json_agg(graphs) AS graphs FROM sessions, graphs ' +
         'WHERE sessions.project_id=$2 AND sessions.id=graphs.session_id ' +
         'GROUP BY sessions.id ORDER BY sessions.created_at DESC',
         [req.user.id, req.params.projectId])
    .then(function(data) {
      res.status(200).json({'success': true, 'data': data});
    })
    .catch(function(err) {
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false});
    });
});

router.get('/graphs/:graphId', ensureLoggedIn, function(req, res, next) {
  db.any('SELECT x, y, time FROM points WHERE graph_id=$1', [req.params.graphId])
    .then(function(data) {
      res.status(200).json({'success': true, 'data': data});
    })
    .catch(function(err) {
      logger.error(err);
      console.trace();
      res.status(200).json({'success': false});
    });
});

router.post('/authorize/slack', cors(), function(req, res, next) {
  var pid = req.body.pid, org_id = req.body.org_id
  var slackInfo = req.body;
  delete slackInfo['pid']
  delete slackInfo['org_id']
  db.one('INSERT INTO notifications (project_id, type, info, organization_id) ' +
         'VALUES (${pid}, ${type}, ${info}, ${org_id}) RETURNING *',
    {pid: pid, type: 'Slack', info: slackInfo, org_id: org_id})
    .then(function(data) {
      res.status(200).json({'success': true, 'data': data});
    })
    .catch(function(err) {
      logger.error(err);
      res.status(200).json({'success': false});
    });
});

module.exports = {
  router: router,
  db: db,
  resetUsers: resetUsers
};
