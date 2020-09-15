const _ = require('lodash');

let testSet = [];
testSet.push({name:1, id:1});
testSet.push({name:1, id:1});
testSet.push({name:1, id:2});
testSet.push({name:2, id:1});

testSet = _.uniqBy(testSet, 'id');
console.log(testSet);