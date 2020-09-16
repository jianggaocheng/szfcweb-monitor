const SzfcClient = require('./lib/szfc');
const QyWechat = require("./lib/qywechat")
const _ = require('lodash');
const { table } = require('table');
const async = require('async');
const process = require('process');
const { logger } = require('./lib/logger');

const RETRY_MAP = {};
let totalHouseList = [];
let projectInterval = 1000;
let buildingInterval = 2000;

const STATUS_ARRAY = ['可售出', '签约中', '已售出', '锁定中'];
const COMPARE_MAP = new Map();
const qywechat = new QyWechat('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=7aa7561c-a218-4661-af98-a43d2a4034a8');

const projectQueue = async.queue(function(project, callback) {
  const buildingQueue = async.queue(function({
    szfcClient,
    building
  }, callback) {
    setTimeout(async () => {
      try {
        let houseList = await szfcClient.getHouseList(building.project.id, building.id);
        logger.info(`正在获取 [${building.project.district}] [${building.project.name}] [${building.name}] 的网签记录, 获取数量 ${houseList.length}`);
        callback(null, houseList);
      } catch (e) {
        callback(e, []);
      }
    }, buildingInterval);
  }, 1);

  buildingQueue.error(function(err, {szfcClient, building}) {
    let retryCount = RETRY_MAP[building.project.id + building.id] != null ? RETRY_MAP[building.project.id + building.id] : 0;
    
    // buildingQueue.push({szfcClient, building}, saveHouseList);
    projectQueue.push(building.project);
    RETRY_MAP[building.project.id + building.id] = ++retryCount;
    logger.error(`重试 [${building.project.name}] [${building.name}] 第 ${++retryCount} 次`);
  });
  
  const saveHouseList = function(err, houseList) {
    totalHouseList = _.uniqBy(_.concat(totalHouseList, houseList), 'identifier');
    _.map(houseList, function(house) {
      compareHouse(house);
    })
  }

  setTimeout(async ()=> {
    let szfcClient = await new SzfcClient();

    try {
      let buildingList = await szfcClient.getBuildingList(project);
      logger.info(`${project.name} 下取得 ${buildingList.length} 条楼栋`);
      _(buildingList).forEach(async function(building) {
        buildingQueue.push({
          szfcClient,
          building
        }, saveHouseList);
      });
      callback();
    } catch (e) {
      callback(e);
    }
  }, projectInterval);
}, 50);

projectQueue.error(function(err, project) {
  let retryCount = RETRY_MAP[project.id] != null ? RETRY_MAP[project.id] : 0;

  projectQueue.push(project);
  RETRY_MAP[project.id] = ++retryCount;

  logger.error(`重试 [${project.name}] 第 ${retryCount + 1} 次`);
});

const compareHouse = function(house) {
  // If exist house status, 
  if (COMPARE_MAP.has(house.identifier)) {
    let cachedHouse = COMPARE_MAP.get(house.identifier);
    if (cachedHouse.houseStatus != house.houseStatus) {
      // House status changed
      logger.info(`${house.identifier} 状态变化, 原状态 [${STATUS_ARRAY[cachedHouse.houseStatus]}] -> 现状态 [${STATUS_ARRAY[house.houseStatus]}]`);
      qywechat.sendMarkdown(`**${house.identifier} 状态变化!!!**\n原状态 [${STATUS_ARRAY[cachedHouse.houseStatus]}] \n现状态 [${STATUS_ARRAY[house.houseStatus]}]`)
    } else {
      logger.debug(`${house.identifier} 没有变化`);
    }
  }

  COMPARE_MAP.set(house.identifier, house);
}

const calcResult = function() {
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

  logger.info("\n" + table(countTableData));
  qywechat.sendMarkdown(table(countTableData));
}

async function startWatching() {
  // Random next tick
  let nextTick = 30 * 1000 + _.random(30 * 1000);
  logger.info("next tick", nextTick);
  setTimeout(startWatching, nextTick);

  try {
    await projectQueue.push([{
      id: 'b040951a-3028-4b95-b6a2-439e019d013e',
      name: '春风南岸花园一期',
      district: '高新区'
    }, {
      id: '4e5947bb-75a9-4a09-8167-291c7d16a3e2',
      name: '春风南岸花园二期',
      district: '高新区'
    }]);

    calcResult();
  } catch (e) {
    logger.error(e);
  }
}

startWatching();
