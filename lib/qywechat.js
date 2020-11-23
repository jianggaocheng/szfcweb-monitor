const superagent = require('superagent');
const { logger } = require('./logger');

class QyWechat {
  constructor(webHook) {
    this.webHook = webHook;
  }

  async sendMarkdown(body) {
    if (!body) {
      body = '';
    }

    let form = {
      msgtype: 'markdown',
      markdown: {
        content: body
      }
    }
    
    logger.debug("Send push %s %s", this.webHook, JSON.stringify(form));
      
    let pushResult = await superagent
      .post(this.webHook)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(form));
    
    pushResult = JSON.parse(pushResult.text);
    if (pushResult.errcode != 0) {
      logger.error("Push failed: code [%s]  message [%s]", pushResult.errcode, pushResult.errmsg);
    } else {
      logger.debug("Push result: code [%s]  message [%s]", pushResult.errcode, pushResult.errmsg);
    }
  }
}

module.exports = QyWechat;