'use strict';

var cluster = require('cluster'),
    nodesPerCore = 1;


var loopCount = 0;
var loopPerSec = 0;
var timeAverage = [];
function logLoopCount(){
    setTimeout(()=> {
        setTimeout(()=> {
            logLoopCount();
        }, 1);
    }, 1000);

    if(loopPerSec != 0)
        console.log('Loop: ', loopCount, ' Per sec: ', loopPerSec , ' Time Average: ', Math.floor(timeAverage.reduce((a, b) => a + b, 0) / timeAverage.length));
    timeAverage = [];
    loopPerSec = 0;
}

if (cluster.isMaster) {
    var workers = [];

    // Create workers
    for (var i=0; i < nodesPerCore * require('os').cpus().length; i++) {
        workers[i] = cluster.fork({WORKER_INDEX:i});
        workers[i].on('message', function(msg){
            var time = parseInt(msg);
            timeAverage.push(time);
            loopCount++;
            loopPerSec++;
        });
    }

    logLoopCount();

} else {
    var WORKER_INDEX = process.env.WORKER_INDEX;
    var runFor = 1000*60*60; // 1 hour
    var startLoop = Date.now();
    var numLoops = 0;

    console.log('Starting worker: ', WORKER_INDEX);

    while((startLoop + runFor) - Date.now() > 0){
        var start = Date.now();

        var i = 0;
        while(i<1000000000){
            i++;
        }

        var end = Date.now();

        numLoops++;

        var time = end - start;

        process.send(time);
        //console.log('Time: ',end - start, ' Loops:', numLoops, ' Timeleft:', (startLoop + runFor) - Date.now());
    }

}
