const async = require('async');

// create a queue object with concurrency 2
var q = async.queue(function(task, callback) {
  console.log('hello ' + task.name);
  setTimeout(()=>{
    callback(null, task);
  }, 1000);
}, 1);

// assign a callback
q.drain(function() {
  console.log('all items have been processed');
});

// add some items to the queue
q.push({name: 'foo'}, function(err, task) {
  console.log('finished processing foo', task.name);
});
// callback is optional
q.push({name: 'bar'});

// add some items to the queue (batch-wise)
q.push([{name: 'baz'},{name: 'bay'},{name: 'bax'}], function(err) {
  console.log('finished processing item');
});
