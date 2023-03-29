var dotenv = require('dotenv');
dotenv.load();
var express = require('express');
var app = express();
var server = require('http').Server(app);
var redisClient = require('redis').createClient(6379, process.env.REDIS_HOSTNAME);

module.exports = {
  server: server,
  app: app,
  redisClient: redisClient
}
