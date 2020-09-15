const { logger } = require('./lib/logger');
const SzfcClient = require('./lib/szfc');
const _ = require('lodash');
const { table } = require('table');
const async = require('async');
const process = require('process');

const RETRY_MAP = {};
let totalHouseList = [];
let startTimeStamp = 0;
let unsellCount = 0;
let sellingCount = 0;
let soldCount = 0;
let disableCount = 0;

let projectInterval = 1200;
let buildingInterval = 1200;

const projectQueue = async.queue(function(project, callback) {
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
}, 10);

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

projectQueue.error(function(err, project) {
  let retryCount = RETRY_MAP[project.id] != null ? RETRY_MAP[project.id] : 0;

  projectQueue.push(project);
  RETRY_MAP[project.id] = ++retryCount;

  logger.error(`重试 [${project.name}] 第 ${retryCount + 1} 次`);
});

buildingQueue.error(function(err, {szfcClient, building}) {
  let retryCount = RETRY_MAP[building.project.id + building.id] != null ? RETRY_MAP[building.project.id + building.id] : 0;
  
  buildingQueue.push({szfcClient, building}, saveHouseList);
  RETRY_MAP[building.project.id + building.id] = ++retryCount;

  logger.error(`重试 [${building.project.name}] [${building.name}] 第 ${++retryCount} 次`);
});

const saveHouseList = function(err, houseList) {
  totalHouseList = _.concat(totalHouseList, houseList);
}

const calcResult = function() {
  let endTimeStamp = new Date().getTime();

  logger.info(`Project queue: ${projectQueue.length()}`);
  logger.info(`Building queue: ${buildingQueue.length()}`);
  logger.info(`花费时间: ${(endTimeStamp - startTimeStamp)/1000} 秒`);
  logger.info(`取得数据: ${totalHouseList.length} 条`);

  unsellCount += _.filter(totalHouseList, {houseStatus: 0}).length;
  sellingCount += _.filter(totalHouseList, {houseStatus: 1}).length;
  soldCount += _.filter(totalHouseList, {houseStatus: 2}).length;
  disableCount += _.filter(totalHouseList, {houseStatus: 3}).length;

  let countTableData = [];
  countTableData.push(['可售出', unsellCount]);
  countTableData.push(['签约中', sellingCount]);
  countTableData.push(['已售出', soldCount]);
  countTableData.push(['锁定中', disableCount]);
  countTableData.push(['合计', totalHouseList.length]);

  logger.info("\n" + table(countTableData));
}

process.on('SIGINT', function() {
  process.exit();
});

process.on('exit', function() {
  calcResult();
});

startTimeStamp = new Date().getTime();

(async function () {
  let szfcClient = await new SzfcClient();

  let districtList = await szfcClient.getDistrictList();
  logger.debug(`取得 ${districtList.length} 个地区`);

  _(districtList).forEach(async function(district) {
    let pageSize = await szfcClient.getProjectCount(district);

    logger.info(`${district} 共有 ${pageSize} 页数据`);

    // Loop project list page
    for (let i=1; i<= pageSize; i++) {
      let projectList = await szfcClient.getProjectList(district, i);
      logger.debug(`从 ${district} 第 ${i} 页取得 ${projectList.length} 条数据`);

      // Loop building under project
      _(projectList).forEach(async function(project) {
        await projectQueue.push(project);
      });
    }
  });
}());

// (async function () {
//   await szfc.getSaleInfoProListIndex();

//   projectQueue.push([{
//     id: 'b040951a-3028-4b95-b6a2-439e019d013e',
//     name: '春风南岸花园一期',
//     district: '高新区'
//   }, {
//     id: '4e5947bb-75a9-4a09-8167-291c7d16a3e2',
//     name: '春风南岸花园二期',
//     district: '高新区'
//   }]);

//   await Promise.all([projectQueue.drain(), buildingQueue.drain()]);
// }());
