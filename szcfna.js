const SzfcClient = require('./lib/szfc');
const QyWechat = require("./lib/qywechat");
const _ = require('lodash');
const { table } = require('table');
const jsonFormat = require('json-format');
const fs = require('fs');
const path = require('path');
const { logger } = require('./lib/logger');
const utils = require('./lib/utils');

const DATA_PATH = path.join("./data");
const DATA_FILE = "cfna.json";

let totalHouseList = [];
let projectInterval = 1000;
let buildingInterval = 2000;

const STATUS_ARRAY = ['可售出', '签约中', '已售出', '锁定中'];
const ORIGIN_HOUSE_LIST = loadHouseStatus();
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
  }, {
    id: 'c0976b7b-26eb-44dd-8670-3e82e4f0e897',
    name: '春风南岸花园三期',
    district: '高新区'
  }
];

const calcResult = function() {
  if(_.isEmpty(totalHouseList)) {
    return;
  }

  let unsellCount = _.filter(totalHouseList, {houseStatus: 0}).length;
  let sellingCount = _.filter(totalHouseList, {houseStatus: 1}).length;
  let soldCount = _.filter(totalHouseList, {houseStatus: 2}).length;
  let disableCount = _.filter(totalHouseList, {houseStatus: 3}).length;

  let countTableData = [];
  countTableData.push(['可售出', unsellCount]);
  countTableData.push(['签约中', sellingCount]);
  countTableData.push(['已售出', soldCount]);
  countTableData.push(['锁定中', disableCount]);
  countTableData.push(['合计', totalHouseList.length]);
  
  logger.info(" ");
  table(countTableData).split("\n").forEach(line => {
    logger.info(line);
  })
}

async function startWatching() {
  try {
    for (let i = 0; i < PROJECT_LIST.length; i++) {
      let szfcClient = await new SzfcClient();

      let project = PROJECT_LIST[i];

      logger.info(`正在获取 ${project.id} ${project.name} 的数据`);
      let buildingList = await szfcClient.getBuildingList(project);
      logger.info(`${project.name} 下取得 ${buildingList.length} 条楼栋`);

      for (let j = 0; j < buildingList.length; j++) {
        let building = buildingList[j];

        let houseList = await szfcClient.getHouseList(building.project.id, building.id);
        
        // Append project and building info
        _.each(houseList, (house) =>{
          house.project = project;
          house.building = building;

          let cachedHouse = _.find(ORIGIN_HOUSE_LIST, {
            identifier: house.identifier
          });

          if (cachedHouse && cachedHouse.houseStatus != house.houseStatus) {
            // House status changed
            logger.info(`${house.project.name} ${house.building.name}栋 ${house.houseSN}室 状态变化, 原状态 [${STATUS_ARRAY[cachedHouse.houseStatus]}] -> 现状态 [${STATUS_ARRAY[house.houseStatus]}]`);
            qywechat.sendMarkdown(`**${house.project.name} ${house.building.name}栋 ${house.houseSN}室 状态变化!!!**\n原状态 [${STATUS_ARRAY[cachedHouse.houseStatus]}] \n现状态 [${STATUS_ARRAY[house.houseStatus]}]`);
          }
        });

        let unsellCount = _.filter(houseList, {houseStatus: 0}).length;
        let sellingCount = _.filter(houseList, {houseStatus: 1}).length;
        let soldCount = _.filter(houseList, {houseStatus: 2}).length;
        let disableCount = _.filter(houseList, {houseStatus: 3}).length;

        logger.info(`已获取 [${building.project.district}] [${building.project.name}] [${building.name}] 的网签记录, 获取数量 ${houseList.length} ${unsellCount}/${sellingCount}/${soldCount}/${disableCount}`);

        totalHouseList = _.uniqBy(_.concat(totalHouseList, houseList), 'identifier');
        
        await utils.randomSleepAsync();
      }
    }

    calcResult();
    saveHouseStatus(totalHouseList);
  } catch (e) {
    logger.error(e);
  }
}

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

function saveHouseStatus(data) {
  let exist = fs.existsSync(path.join(DATA_PATH, DATA_FILE));

  if (!exist) {
    fs.mkdirSync(DATA_PATH);
    logger.error("Data path not exist!");
    return;
  }

  let config = {
    type: 'space',
    size: 2
  };

  fs.writeFileSync(path.join(DATA_PATH, DATA_FILE), jsonFormat(data, config));
}

startWatching();
