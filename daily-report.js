const QyWechat = require("./lib/qywechat");
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { logger } = require('./lib/logger');

const DATA_PATH = path.join("./data");
const DATA_FILE = "cfna.json";

const qywechat = new QyWechat('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=7aa7561c-a218-4661-af98-a43d2a4034a8');

const PROJECT_LIST = [
  {
    id: 'b040951a-3028-4b95-b6a2-439e019d013e',
    name: '春风南岸花园一期',
    district: '高新区'
  }, {
    id: '4e5947bb-75a9-4a09-8167-291c7d16a3e2',
    name: '春风南岸花园二期',
    district: '高新区'
  }
];

function loadHouseStatus() {
  let data = [];
  let exist = fs.existsSync(path.join(DATA_PATH, DATA_FILE));

  if (!exist) {
    logger.debug("Data file not exist");

    if (!fs.existsSync(path.resolve(DATA_PATH))) {
      fs.mkdirSync(DATA_PATH);
    }
    fs.writeFileSync(path.join(DATA_PATH, DATA_FILE), JSON.stringify(data));
  } else {
    data = JSON.parse(fs.readFileSync(path.join(DATA_PATH, DATA_FILE), "utf-8"));
  }

  return data;
}

function report() {
  let totalHouseList = loadHouseStatus();

  if (_.isEmpty(totalHouseList)) {
    logger.info('ignore empty house list');
    return;
  }

  let now = new Date();
  let report = `** ${now.getMonth()+1}.${now.getDate()} 销售日报 **\n`;

  for (let i=0; i<PROJECT_LIST.length; i++) {
    let project = PROJECT_LIST[i];
    let totalCount = _.filter(totalHouseList, (value) => value.project.id == project.id).length;
    let unsellCount = _.filter(totalHouseList, {houseStatus: 0, project: project}).length;
    
    let sellProgress = _.round(1 - (unsellCount/totalCount), 2);
    logger.info(`${project.name} 总共: [${totalCount}] 已售出: [${totalCount-unsellCount}] 销售率: [${sellProgress}]`);
    report += `${project.name} \n总共: [${totalCount}] \n已售出: [${totalCount-unsellCount}] \n销售率: [${sellProgress}]\n\n\n`
  }

  let totalCount = totalHouseList.length;
  let unsellCount = _.filter(totalHouseList, {houseStatus: 0}).length;
  let sellProgress = _.round(1 - (unsellCount/totalCount), 2);
  logger.info(`合计总共: [${totalCount}] 已售出: [${totalCount-unsellCount}] 销售率: [${sellProgress}]`);
  report += `合计总共: [${totalCount}] \n已售出: [${totalCount-unsellCount}] \n销售率: [${sellProgress}]\n`;

  qywechat.sendMarkdown(report);
}

report();