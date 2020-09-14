const logger = require('./lib/logger');
const szfc = require('./lib/szfc');

(async function () {
  await szfc.getSaleInfoProListIndex();

  await szfc.getDistrictList();

  await szfc.getProjectList("工业园区");
}());

