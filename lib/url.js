const URL_BASE = "http://spf.szfcweb.com/szfcweb";

class SzfcUrl {
  constructor(sessionKey) {
    this.sessionKey = sessionKey;
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
}

module.exports = SzfcUrl;