const superagent = require('superagent');
const $ = require('cheerio');
const _ = require('lodash');
const { table } = require('table');
const queryString = require('query-string');
const { logger } = require('./logger');
const SzfcUrl = require('./url');

const URL_SALE_INFO_PROLIST_INDEX = "http://spf.szfcweb.com/szfcweb/DataSerach/SaleInfoProListIndex.aspx";

let szfcUrl;

let URL_CURRENT_SALE_INFO = "";
let URL_CURRENT_BUILDING_INFO = "";

let VIEW_STATE = "";
let VIEWSTATEGENERATOR = "";
let EVENTVALIDATION = "";

const COLOR_HOUSE_MAP = {
  '#66cc33': 0,
  'Yellow': 1,
  '#cccccc': 2,
  '#666600': 3
}

const getSaleInfoProListIndex = async function() {
  logger.debug("1111");

  const res = await superagent.get(URL_SALE_INFO_PROLIST_INDEX);

  logger.debug("2222");

  let indexUrl = res.redirects[0];
  logger.debug("current url: ", indexUrl);

  let sessionKey = indexUrl.split('/')[4];
  szfcUrl = new SzfcUrl(sessionKey);


  refreshViewState(res);
}

const getDistrictList = async function() {
  const res = await superagent.get(szfcUrl.getProjectUrl());

  refreshViewState(res);

  let districtList = [];
  let districtDomList = $('#ctl00_MainContent_ddl_RD_CODE option', res.text);
  for (let i=0; i<districtDomList.length; i++) {
    districtList.push($(districtDomList[i]).text());
  }

  return districtList;
}

const getProjectCount = async function(district) {
  const res = await superagent.post(szfcUrl.getProjectUrl())
    .type('form')
    .send({'__VIEWSTATE': VIEW_STATE})
    .send({'__VIEWSTATEGENERATOR': VIEWSTATEGENERATOR})
    .send({'__EVENTVALIDATION': EVENTVALIDATION})
    .send({"ctl00$MainContent$txt_Pro": ""})
    .send({"ctl00$MainContent$ddl_RD_CODE": district})
    .send({"ctl00$MainContent$txt_Com": ""})
    .send({"ctl00$MainContent$bt_select": "查询"});

  refreshViewState(res);
  
  let lastOption = $('td select option', res.text).last();
  let pageSize = $(lastOption).text();
  logger.debug(`${district} 总共发现 ${pageSize} 页数据`, );
  return pageSize;
}

const getProjectList = async function(district, page) {
  const projectList = [];
  logger.debug(`${district} 正在获取第 ${page} 页内容`);
  const res = await superagent.post(szfcUrl.getProjectUrl())
    .type('form')
    .send({'__EVENTTARGET': 'ctl00$MainContent$OraclePager1$ctl12$PageList'})
    .send({'__EVENTARGUMENT': ''})
    .send({'__LASTFOCUS': ''})
    .send({'__VIEWSTATE': VIEW_STATE})
    .send({'__VIEWSTATEGENERATOR': VIEWSTATEGENERATOR})
    .send({'__EVENTVALIDATION': EVENTVALIDATION})
    .send({"ctl00$MainContent$txt_Pro": ""})
    .send({"ctl00$MainContent$ddl_RD_CODE": district})
    .send({"ctl00$MainContent$txt_Com": ""})
    .send({"ctl00$MainContent$OraclePager1$ctl12$PageList": page - 1});

  refreshViewState(res);
  
  let projectDomList = $('td font a', res.text);
  for (let i=0; i<projectDomList.length; i++) {
    logger.debug($(projectDomList[i]).attr('href').split('=')[1], $(projectDomList[i]).text());
    projectList.push({
      id: $(projectDomList[i]).attr('href').split('=')[1],
      name: $(projectDomList[i]).text(),
      district: district
    });
  }

  return projectList;
}

const getBuildingCount = async function(projectId) {
  
}

const getBuildingList = async function(projectId) {
  const budilgIdList = [];
  const res = await superagent
    .get(szfcUrl.getBuildingUrl(projectId))
    .set('Referer', szfcUrl.getProjectUrl());

  refreshViewState(res);

  let buildingDomList = $('td font a', res.text);
  for (let i=0; i<buildingDomList.length; i++) {
    let param = queryString.parse(_.replace($(buildingDomList[i]).attr('href'), 'SaleInfoHouseShow.aspx?', ''));
    logger.debug(param['PBTAB_ID'], $(buildingDomList[i]).text());
    budilgIdList.push({
      id: param['PBTAB_ID'],
      name: $(buildingDomList[i]).text(),
    });
  }

  if (buildingDomList.length == 0) {
    logger.error(res.text)
    logger.error(`请求过于频繁 ${projectId}`);
  }

  logger.debug(budilgIdList);
  return budilgIdList;
}

const getHouseList = async function(projectId, buildingId) {
  const houseList = [];
  const res = await superagent
    .get(szfcUrl.getHouseListUrl(projectId, buildingId))
    .set('Referer', szfcUrl.getProjectUrl());

  refreshViewState(res);

  let tdDomList = $('#ctl00_MainContent_gvxml td', res.text);
  for (let i=0; i<tdDomList.length; i++) {
    let houseSN = $(tdDomList[i]).text();
    if (_.isEmpty(_.trim(houseSN))) {
      continue;
    }
    let colorFlag = COLOR_HOUSE_MAP[tdDomList[i].attribs.bgcolor];

    houseList.push({
      houseSN: houseSN,
      houseStatus: colorFlag
    })
  }

  if (tdDomList.length == 0 && _.includes(res.text, '频繁')) {
    logger.error(`请求过于频繁 ${projectId} ${buildingId}`);
  }

  return houseList;
}

const refreshViewState = function(res) {
  VIEW_STATE = $('#__VIEWSTATE', res.text).val();
  VIEWSTATEGENERATOR = $('#__VIEWSTATEGENERATOR', res.text).val();
  EVENTVALIDATION = $('#__EVENTVALIDATION', res.text).val();

  // logger.debug("viewstate: ", VIEW_STATE);
  // logger.debug("viewstate generator: ", VIEWSTATEGENERATOR);
  // logger.debug("event validation: ", EVENTVALIDATION);
}

module.exports = {
  getSaleInfoProListIndex,
  getDistrictList,
  getProjectCount,
  getProjectList,
  getBuildingCount,
  getBuildingList,
  getHouseList
}