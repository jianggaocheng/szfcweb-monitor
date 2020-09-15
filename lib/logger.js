const log4js = require("log4js");

log4js.configure({
  appenders: { 'szfcweb-monitor': { type: 'stdout' } },
  categories: { default: { appenders: ['szfcweb-monitor'], level: 'info' } }
});

const logger = log4js.getLogger('szfcweb-monitor');
global.logger = logger;
module.exports.logger = logger;
