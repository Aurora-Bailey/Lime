'use strict';

global.__DEV = true;

var cluster = require('cluster'),
    port = 7070;

if (cluster.isMaster) {
    var workers = [];

    // Create workers
    for (var i=0; i<require('os').cpus().length * 2; i++) {
        workers[i] = cluster.fork({WORKER_INDEX:i});
    }

    // Create net server at master
    var netServer = require('net').createServer({pauseOnConnect:true}, function(c) {
        var r = Math.floor( Math.random()*workers.length );
        workers[r].send("doit",c);
    }).listen(7777);

    netServer.on('connect',((e) => {
        console.log(e);
    }));
} else {
    port = parseInt((process.env.WORKER_INDEX > 9 ? 70 : 700) + process.env.WORKER_INDEX);
    console.log("Starting worker " + process.env.WORKER_INDEX);

    var http = require('http'),
        WebSocketServer = require('ws').Server,
        express = require('express');

    var server = http.createServer(),
        wss = new WebSocketServer({ server: server }),
        app = express();

    app.use(function (req, res) {
        // This is sent when the WebSocket is requested as a webpage
        res.send("This is a WebSocket -_-");
    });

    wss.on('connection', function connection(ws) {
        ws.sendObj = function(obj){
            ws.send(JSON.stringify(obj));

            if(__DEV)
                console.log(Date.now() + '<-out:', JSON.stringify(obj));
        };
        ws.on('message', function incoming(data){
            var d = JSON.parse(data);

            if(d.m == 'load'){
                Game.artificioalLoad = parseInt(d.v);
                ws.sendObj({load: Game.artificioalLoad});
            }

            if(d.m == 'get'){
                ws.sendObj(Game.getServerLoad(true));
            }

            if(d.m == 'ping'){
                ws.sendObj(d);
            }

            if(d.m == 'server'){
                ws.sendObj({v: process.env.WORKER_INDEX});
            }

            if(__DEV)
                console.log(Date.now() + '->in:', data);
        });

        // Request login status from every new connection
        ws.sendObj({m: 'hi'});
    });

    server.on('request', app);
    server.listen(port, function () { console.log('Listening on ' + server.address().port) });

    // Get message from master and check if need pass to http server
    process.on('message', function(m,c) {
        if ( "doit" === m ) {
            server.emit('connection', c);
            c.resume();
        }
    });
}






// Game Loop
class Game {
    static init(){
        // Tweakable
        this.loopDelay = 50;//20 ticks per second

        // Default
        this.lastLoop = Date.now();
        this.lastSecond = Date.now();
        this.loopCount = 0;
        this.computeCountSec = 0;


        // Server load
        this.serverLoad = {};
        this.serverLoad.tick = [];
        this.serverLoad.tps = 0; //ticks per second
        this.serverLoad.lastSecond = Date.now();
        this.serverLoad.current = 0;
        this.serverLoad.high = 0;
        this.serverLoad.low = 0;

        this.artificioalLoad = 25000000;

        // Start the game loop
        this.loop();
    }

    static getServerLoad(JSON){
        if(JSON)
            return {'t': this.serverLoad.tps, 'a': this.serverLoad.current, 'h': this.serverLoad.high, 'l': this.serverLoad.low};
        else
            return 'tps: ' + this.serverLoad.tps + ' Average: ' + this.serverLoad.current + '% High: ' + this.serverLoad.high + '% Low: ' + this.serverLoad.low + '% (percent of compute time used per tick)';
    }

    static loop(){
        setTimeout(()=>{setTimeout(()=>{this.loop()}, 1);}, this.loopDelay);
        this.lastLoop = Date.now();
        this.loopCount++;

        // Executed once per real second
        if(Date.now() - this.lastSecond > 1000){
            this.lastSecond = Date.now();
        }

        // Artificial load
        var i = 0;
        while(i<this.artificioalLoad){
            i++
        }


        // === Server load
        var computeTime = Date.now() - this.lastLoop;
        var loadPercent = Math.round((100 / this.loopDelay) * computeTime);
        this.serverLoad.tick.push(loadPercent);
        // Executed once per game second
        if(this.loopCount % (1000 / this.loopDelay) == 0){
            this.serverLoad.current = this.serverLoad.tick.reduce((a, b) => a + b, 0) / this.serverLoad.tick.length;
            this.serverLoad.low = this.serverLoad.tick.reduce((a, b) => a < b ? a:b);
            this.serverLoad.high = this.serverLoad.tick.reduce((a, b) => a > b ? a:b);
            this.serverLoad.tick = [];


            // Ticks per second
            var timeLastSec = Date.now() - this.serverLoad.lastSecond;
            this.serverLoad.lastSecond = Date.now();
            this.serverLoad.tps = (1000 / timeLastSec) * (1000 / this.loopDelay);

            //console.log(this.getServerLoad(false));
        }


    }
}
Game.init();