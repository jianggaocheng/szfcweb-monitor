const _ = require('lodash');

const sleepAsync = async (sleepms) => {
  return new Promise((resolve, reject)=> {
    setTimeout(() => {
      resolve();
    }, sleepms)
  });
}

const randomSleepAsync = async () => {
  let sleep = 2 * 1000 + _.random(3 * 1000);
  await sleepAsync(sleep);
}

module.exports = {
  sleepAsync,
  randomSleepAsync,
}