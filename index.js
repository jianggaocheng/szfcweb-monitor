const { logger } = require('./lib/logger');
const szfc = require('./lib/szfc');
const _ = require('lodash');
const { table } = require('table');
const async = require('async');
const process = require('process');

let totalHouseList = [];
let startTimeStamp = 0;
let unsellCount = 0;
let sellingCount = 0;
let soldCount = 0;
let disableCount = 0;

const projectQueue = async.queue(async function(project, callback) {
  let buildingList = await szfc.getBuildingList(project.id);
  logger.info(`${project.name} 下取得 ${buildingList.length} 条楼栋`);
  _(buildingList).forEach(async function(building) {
    buildingQueue.push(building);
  });

  setTimeout(callback, 1000);
}, 5);

const buildingQueue = async.queue(async function(building, callback) {
  let houseList = await szfc.getHouseList(project.id, building.id);
    logger.info(`正在获取 [${project.district}] [${project.name}] [${building.name}] 的网签记录, 获取数量 ${houseList.length}`);
    _.merge(totalHouseList, houseList);

  setTimeout(callback, 1000);
}, 5);

const calcResult = function() {
  let endTimeStamp = new Date().getTime();

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

projectQueue.drain(calcResult);
process.on('SIGINT', function() {
  calcResult();
  process.exit();
});

(async function () {
  startTimeStamp = new Date().getTime();
  await szfc.getSaleInfoProListIndex();

  let districtList = await szfc.getDistrictList();
  logger.debug(`取得 ${districtList.length} 个地区`);

  _(districtList).forEach(async function(district) {
    let pageSize = await szfc.getProjectCount(district);

    logger.info(`${district} 共有 ${pageSize} 页数据`);

    // Loop project list page
    for (let i=1; i<= pageSize; i++) {
      let projectList = await szfc.getProjectList(district, i);
      logger.info(`从 ${district} 第 ${i} 页取得 ${projectList.length} 条数据`);

      // Loop building under project
      _(projectList).forEach(async function(project) {
        await projectQueue.push(project);
      });
    }
  });

  // let pageSize = await szfc.getProjectCount("工业园区");
  // await szfc.getProjectList("工业园区", 1);
  // let unsellCount = 0;
  // let sellingCount = 0;
  // let soldCount = 0;
  // let disableCount = 0;
  
  // let buildingList = await szfc.getBuildingList("bc2a3814-105f-417c-a7d3-62d4d9d82f31");

  // let houseList = await szfc.getHouseList("b040951a-3028-4b95-b6a2-439e019d013e", "30230_MD004");
  
  
}());

