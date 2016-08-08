'use strict';

global.__DEV = true;

var http = require('http')
    , WebSocketServer = require('ws').Server
    , express = require('express');

var server = http.createServer()
    , wss = new WebSocketServer({ server: server })
    , app = express()
    , port = 7777;

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
        ws.send(data);

        if(__DEV)
            console.log(Date.now() + '->in:', data);
    });

    // Request login status from every new connection
    ws.sendObj({m: 'hi'});
});

server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });


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
        this.serverLoad.current = 0;
        this.serverLoad.high = 0;
        this.serverLoad.low = 0;

        // Start the game loop
        this.loop();
    }

    static getServerLoad(JSON){
        if(JSON)
            return {'a': this.serverLoad.current, 'h': this.serverLoad.high, 'l': this.serverLoad.low};
        else
            return 'Average: ' + this.serverLoad.current + '% High: ' + this.serverLoad.high + '% Low: ' + this.serverLoad.low + '% (percent of compute time used per tick)';
    }

    static loop(){
        setTimeout(()=>{this.loop()}, this.loopDelay);
        this.lastLoop = Date.now();
        this.loopCount++;

        // Executed once per real second
        if(Date.now() - this.lastSecond > 1000){
            this.lastSecond = Date.now();
        }

        // Artificial load
        var i = 0;
        while(i<50000000){
            i++
        }


        // === Server load
        var computeTime = Date.now() - this.lastLoop;
        var loadPercent = (100 / this.loopDelay) * computeTime;
        this.serverLoad.tick.push(loadPercent);
        // Executed once per game second
        if(this.loopCount % (1000 / this.loopDelay) == 0){
            this.serverLoad.current = this.serverLoad.tick.reduce((a, b) => a + b, 0) / this.serverLoad.tick.length;
            this.serverLoad.low = this.serverLoad.tick.reduce((a, b) => a < b ? a:b);
            this.serverLoad.high = this.serverLoad.tick.reduce((a, b) => a > b ? a:b);
            this.serverLoad.tick = [];

            console.log(this.getServerLoad(false));
        }


    }
}
Game.init();