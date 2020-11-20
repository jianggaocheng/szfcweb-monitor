
// Daily report
schedule.scheduleJob('0 0 22 * * *', () => {
  if (_.isEmpty(totalHouseList)) {
    log.info('ignore empty house list');
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
});

startWatching();