'use strict';

var __DEV = true,
    version = 0.001,
    compatible = '9ICXM7PGXJ';

var cluster = require('cluster'),
    nodesPerCore = 1,
    port = 7000;

if (cluster.isMaster) {
    var masterPort = parseInt(port) + 777;
    var workers = [];

    // Create workers
    for (var i=0; i < nodesPerCore * require('os').cpus().length; i++) {
        workers[i] = cluster.fork({WORKER_INDEX:i});
    }

    // Create net server at master
    var netServer = require('net').createServer({pauseOnConnect:true}, function(c) {
        var r = 0;//Math.floor( Math.random()*workers.length );
        workers[r].send("doit",c);
    }).listen(masterPort);
} else {
    var WORKER_INDEX = process.env.WORKER_INDEX,
        gamePort = parseInt(port) + parseInt(WORKER_INDEX),
        http = require('http'),
        WebSocketServer = require('ws').Server,
        express = require('express'),
        server = http.createServer(),
        wss = new WebSocketServer({server: server}),
        app = express();

    app.use(function (req, res) {
        // This is sent when the WebSocket is requested as a webpage
        res.send("This is a WebSocket -_-");
    });

    wss.on('connection', function connection(ws) {
        ws.sendObj = function (obj) {
            ws.send(JSON.stringify(obj));

            if (__DEV)
                console.log(Date.now() + '<-out:', JSON.stringify(obj));
        };
        ws.on('message', function incoming(data) {
            try{
                if (__DEV)
                    console.log(Date.now() + '->in:', data);

                var d = JSON.parse(data);

                if(typeof d[0] !== 'undefined'){
                    console.log('array');
                    Game.players[ws.playerId].asdf = 'qwerty';
                    if(d[0] == 2){// player input
                        if(d[1] != 0)
                            Game.players[ws.playerId].direction = (parseInt(d[1]) / 1000) - Math.PI;

                        if(d[2] != 0)
                            Game.players[ws.playerId].thruster = parseInt(d[2]);

                        if(d[3] != 0)
                            Game.players[ws.playerId].weapon = parseInt(d[3]);

                        if(d[4] != 0)
                            Game.players[ws.playerId].message = d[4];
                    }

                }else if(d.m == "start"){
                    var tryId = Lib.randString(3, true, true, false);
                    while(typeof Game.players[tryId] !== 'undefined'){
                        tryId = Lib.randString(3, true, true, false);
                    }
                    ws.playerId = tryId;
                    Game.players[tryId] = {
                        ws: ws,
                        connected: true,
                        id: tryId,
                        name: d.n,
                        type: d.t,
                        x: 0,
                        y: 0,
                        direction: 0,
                        thruster: 2,
                        weapon: 2,
                        message: ''};

                    ws.sendObj({m:'go', v: tryId});

                }else if(d.m == 'compatible'){
                    if(compatible == d.v){
                        ws.sendObj({m: 'ready'});
                    }else{
                        ws.sendObj({m: 'compatible', v: false});
                    }

                }else if (d.m == 'load') {
                    Game.artificioalLoad = parseInt(d.v);
                    ws.sendObj({load: Game.artificioalLoad});
                }else if (d.m == 'get') {
                    ws.sendObj(Game.getServerLoad(true));
                }else if (d.m == 'ping') {
                    ws.sendObj(d);
                }else if (d.m == 'server') {
                    ws.sendObj({m:'server', v: WORKER_INDEX});
                }
            }
            catch(err){
                if (__DEV)console.log('Bad Packet: ', data, err);
            }
        });

        ws.on('close', function(){
            Game.players[ws.playerId].connected = false;
        });

        ws.sendObj({m: 'hi'});
    });

    server.on('request', app);
    server.listen(gamePort, function () {
        console.log('Worker ' + WORKER_INDEX + ' listening on ' + server.address().port)
    });

    // Get message from master and check if need pass to http server
    process.on('message', function (m, c) {
        if ("doit" === m) {
            server.emit('connection', c);
            c.resume();
        }
    });


// Game Loop
    class Game {
        static init() {
            // Game data
            this.players = {};


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

            this.artificioalLoad = 200000;

            // Start the game loop
            this.loop();
        }

        static getServerLoad(JSON) {
            if (JSON)
                return {
                    't': this.serverLoad.tps,
                    'a': this.serverLoad.current,
                    'h': this.serverLoad.high,
                    'l': this.serverLoad.low
                };
            else
                return 'tps: ' + this.serverLoad.tps + ' Average: ' + this.serverLoad.current + '% High: ' + this.serverLoad.high + '% Low: ' + this.serverLoad.low + '% (percent of compute time used per tick)';
        }

        static loop() {
            setTimeout(()=> {
                setTimeout(()=> {
                    this.loop()
                }, 1);
            }, this.loopDelay);
            this.lastLoop = Date.now();
            this.loopCount++;

            // Executed once per real second
            if (Date.now() - this.lastSecond > 1000) {
                this.lastSecond = Date.now();
            }

            // Artificial load
            var i = 0;
            while (i < this.artificioalLoad) {
                i++
            }


            // === Server load
            var computeTime = Date.now() - this.lastLoop;
            var loadPercent = Math.round((100 / this.loopDelay) * computeTime);
            this.serverLoad.tick.push(loadPercent);
            // Executed once per game second
            if (this.loopCount % (1000 / this.loopDelay) == 0) {
                this.serverLoad.current = this.serverLoad.tick.reduce((a, b) => a + b, 0) / this.serverLoad.tick.length;
                this.serverLoad.low = this.serverLoad.tick.reduce((a, b) => a < b ? a : b);
                this.serverLoad.high = this.serverLoad.tick.reduce((a, b) => a > b ? a : b);
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

}

class Lib{
    static randString(length, lower, upper, numbers){
        var text = "";
        var possible = "";
        var possLower = 'abcdefghijklmnopqrstuvwxyz';
        var possUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var possNum = '0123456789';

        if(lower)
            possible += possLower;
        if(upper)
            possible += possUpper;
        if(numbers)
            possible += posNum;

        for( var i=0; i < length; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
}
