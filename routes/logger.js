/**
 * Created by nicojimenez on 7/11/17.
 */
var winston = require('winston');

require('winston-papertrail').Papertrail;

var winstonPapertrail = new winston.transports.Papertrail({
  level: 'debug',
  host: 'logs6.papertrailapp.com',
  port: 14272
});

var consoleTransport = new winston.transports.Console({
  level: 'debug',
  timestamp: function() {
    return new Date().toString();
  },
  colorize: true
});

winstonPapertrail.on('error', function(err) {
  logger.error(err);
});

var logger = new winston.Logger({ transports: [consoleTransport, winstonPapertrail] });

module.exports = logger;
