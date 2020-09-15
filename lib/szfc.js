const superagent = require('superagent');
const $ = require('cheerio');
const _ = require('lodash');
const { table } = require('table');
const queryString = require('query-string');
const { logger } = require('./logger');

const URL_SALE_INFO_PROLIST_INDEX = "http://spf.szfcweb.com/szfcweb/DataSerach/SaleInfoProListIndex.aspx";

const COLOR_HOUSE_MAP = {
  '#66cc33': 0,
  'Yellow': 1,
  '#cccccc': 2,
  '#666600': 3
}

const URL_BASE = "http://spf.szfcweb.com/szfcweb";

class SzfcClient {
  constructor() {
    return (async () => {
      this.sessionKey = await this.getSaleInfoProListIndex();
      return this
    })()
  }

  getProjectUrl() {
    return `${URL_BASE}/${this.sessionKey}/DataSerach/SaleInfoProListIndex.aspx`;
  }

  getBuildingUrl(projectId) {
    return `${URL_BASE}/${this.sessionKey}/DataSerach/SaleInfoBudingShow.aspx?SPJ_ID=${projectId}`;
  }

  getHouseListUrl(projectId, buildingId) {
    return `${URL_BASE}/${this.sessionKey}/DataSerach/SaleInfoHouseShow.aspx?PBTAB_ID=${buildingId}&SPJ_ID=${projectId}`;
  }

  async getSaleInfoProListIndex() {
    const res = await superagent.get(URL_SALE_INFO_PROLIST_INDEX).timeout(5000);

    let indexUrl = res.redirects[0];
    logger.debug("current url: ", indexUrl);
    let sessionKey = indexUrl.split('/')[4];
    this.refreshViewState(res);
    return sessionKey;
  }

  async getDistrictList() {
    const res = await superagent.get(this.getProjectUrl());
  
    this.refreshViewState(res);
  
    let districtList = [];
    let districtDomList = $('#ctl00_MainContent_ddl_RD_CODE option', res.text);
    for (let i=0; i<districtDomList.length; i++) {
      districtList.push($(districtDomList[i]).text());
    }
  
    return districtList;
  }

  async getProjectCount(district) {
    const res = await superagent.post(this.getProjectUrl())
      .type('form')
      .send({'__VIEWSTATE': this.VIEW_STATE})
      .send({'__VIEWSTATEGENERATOR': this.VIEWSTATEGENERATOR})
      .send({'__EVENTVALIDATION': this.EVENTVALIDATION})
      .send({"ctl00$MainContent$txt_Pro": ""})
      .send({"ctl00$MainContent$ddl_RD_CODE": district})
      .send({"ctl00$MainContent$txt_Com": ""})
      .send({"ctl00$MainContent$bt_select": "查询"});
  
    this.refreshViewState(res);
    
    let lastOption = $('td select option', res.text).last();
    let pageSize = $(lastOption).text();
    logger.debug(`${district} 总共发现 ${pageSize} 页数据`, );
    return pageSize;
  }

  async getProjectList(district, page) {
    const projectList = [];
    logger.debug(`${district} 正在获取第 ${page} 页内容`);
    const res = await superagent.post(this.getProjectUrl())
      .type('form')
      .send({'__EVENTTARGET': 'ctl00$MainContent$OraclePager1$ctl12$PageList'})
      .send({'__EVENTARGUMENT': ''})
      .send({'__LASTFOCUS': ''})
      .send({'__VIEWSTATE': this.VIEW_STATE})
      .send({'__VIEWSTATEGENERATOR': this.VIEWSTATEGENERATOR})
      .send({'__EVENTVALIDATION': this.EVENTVALIDATION})
      .send({"ctl00$MainContent$txt_Pro": ""})
      .send({"ctl00$MainContent$ddl_RD_CODE": district})
      .send({"ctl00$MainContent$txt_Com": ""})
      .send({"ctl00$MainContent$OraclePager1$ctl12$PageList": page - 1});
  
    this.refreshViewState(res);
    
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

  async getBuildingCount(projectId) {
  
  }
  
  async getBuildingList(project) {
    const budilgIdList = [];
    const res = await superagent
      .get(this.getBuildingUrl(project.id))
      .set('Referer', this.getProjectUrl());
  
    this.refreshViewState(res);
  
    let buildingDomList = $('td font a', res.text);
    for (let i=0; i<buildingDomList.length; i++) {
      let param = queryString.parse(_.replace($(buildingDomList[i]).attr('href'), 'SaleInfoHouseShow.aspx?', ''));
      logger.debug(param['PBTAB_ID'], $(buildingDomList[i]).text());
      budilgIdList.push({
        id: param['PBTAB_ID'],
        project: project,
        name: $(buildingDomList[i]).text(),
      });
    }
  
    if (buildingDomList.length == 0) {
      if (_.includes(res.text, '频繁')) {
        logger.error(`请求过于频繁 ${project.id}`);
        throw res.text;
      } else {
        // Show response error
        let errorMsg = $('#ctl00_MainContent_lal_msg font', res.text);
        logger.warn(`获取数据异常 ${project.id} 原因: ${errorMsg}`);
      }
    }
  
    logger.debug(budilgIdList);
    return budilgIdList;
  }
  
  async getHouseList(projectId, buildingId) {
    const houseList = [];
    const res = await superagent
      .get(this.getHouseListUrl(projectId, buildingId))
      .set('Referer', this.getProjectUrl());
  
    this.refreshViewState(res);
  
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
  
    if (tdDomList.length == 0) {
      if (_.includes(res.text, '频繁')) {
        logger.error(`请求过于频繁 ${projectId} ${buildingId}`);
        throw res.text;
      } else {
        // Show response error
        let errorMsg = $('#ctl00_MainContent_lal_msg font', res.text);
        logger.warn(`获取数据异常 ${projectId} ${buildingId} 原因: ${errorMsg.text()}`);
        logger.warn(res.text);
      }
    }
  
    return houseList;
  }

  refreshViewState(res) {
    this.VIEW_STATE = $('#__VIEWSTATE', res.text).val();
    this.VIEWSTATEGENERATOR = $('#__VIEWSTATEGENERATOR', res.text).val();
    this.EVENTVALIDATION = $('#__EVENTVALIDATION', res.text).val();
  
    // logger.debug("viewstate: ", VIEW_STATE);
    // logger.debug("viewstate generator: ", VIEWSTATEGENERATOR);
    // logger.debug("event validation: ", EVENTVALIDATION);
  }
}








module.exports = SzfcClient;