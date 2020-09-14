const superagent = require('superagent');
const $ = require('cheerio');
const _ = require('lodash');

const URL_SALE_INFO_PROLIST_INDEX = "http://spf.szfcweb.com/szfcweb/DataSerach/SaleInfoProListIndex.aspx";

let URL_CURRENT_SALE_INFO = "";
let URL_CURRENT_BUILDING_INFO = "";

let VIEW_STATE = "";
let VIEWSTATEGENERATOR = "";
let EVENTVALIDATION = "";

const getSaleInfoProListIndex = async function() {
  const res = await superagent.get(URL_SALE_INFO_PROLIST_INDEX);
  let indexUrl = res.redirects[0];
  logger.debug("current url: ", indexUrl);
  URL_CURRENT_SALE_INFO = indexUrl;
  URL_CURRENT_BUILDING_INFO = indexUrl.substring(0, indexUrl.lastIndexOf("/") + 1);

  console.log(URL_CURRENT_BUILDING_INFO)

  VIEW_STATE = $('#__VIEWSTATE', res.text).val();
  VIEWSTATEGENERATOR = $('#__VIEWSTATEGENERATOR', res.text).val();
  EVENTVALIDATION = $('#__EVENTVALIDATION', res.text).val();

  logger.debug("viewstate: ", VIEW_STATE);
  logger.debug("viewstate generator: ", VIEWSTATEGENERATOR);
  logger.debug("event validation: ", EVENTVALIDATION);
}

const getDistrictList = async function() {
  const res = await superagent.get(URL_CURRENT_SALE_INFO);
  let districtList = [];
  let districtDomList = $('#ctl00_MainContent_ddl_RD_CODE option', res.text);
  for (let i=0; i<districtDomList.length; i++) {
    districtList.push($(districtDomList[i]).text());
  }

  return districtList;
}

const getProjectCount = async function(district) {
  
}

const getProjectList = async function(district, page) {
  logger.debug(`正在获取第 ${page} 页内容`);
  const res = await superagent.post(URL_CURRENT_SALE_INFO)
    .type('form')
    .send({'__VIEWSTATE': VIEW_STATE})
    .send({'__VIEWSTATEGENERATOR': VIEWSTATEGENERATOR})
    .send({'__EVENTVALIDATION': EVENTVALIDATION})
    .send({"ctl00$MainContent$txt_Pro": ""})
    .send({"ctl00$MainContent$ddl_RD_CODE": district})
    .send({"ctl00$MainContent$txt_Com": ""})
    .send({"ctl00$MainContent$OraclePager1$ctl12$PageList": page - 1});
  
  let projectDomList = $('td font a', res.text);
  for (let i=0; i<projectDomList.length; i++) {
    logger.debug($(projectDomList[i]).attr('href'), $(projectDomList[i]).text());
  }
}

module.exports = {
  getSaleInfoProListIndex,
  getDistrictList,
  getProjectList
}