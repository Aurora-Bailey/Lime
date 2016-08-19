'use strict';

var __DEV = true,
    version = 0.001,
    compatible = '9ICXM7PGXJ';

var cluster = require('cluster'),
    nodesPerCore = 0.25,
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
                    if(d[0] == 2){// player input
                        if(d[1] != 0)
                            Game.players['p' + ws.playerId].direction = parseInt(d[1]);

                        if(d[2] != 0)
                            Game.players['p' + ws.playerId].thruster = parseInt(d[2]);

                        if(d[3] != 0)
                            Game.players['p' + ws.playerId].weapon = parseInt(d[3]);

                        if(d[4] != 0)
                            Game.players['p' + ws.playerId].message = d[4];
                    }

                }else if(d.m == "start"){
                    var emptySpot = Game.getMapEmpty();
                    var tryId = Lib.randString(3, false, false, true);
                    while(typeof Game.players['p' + tryId] !== 'undefined'){
                        tryId = Lib.randString(3, false, false, true);
                    }
                    tryId = parseInt(tryId);
                    ws.playerId = tryId;
                    Game.players['p' + tryId] = {
                        ws: ws,
                        view: {w: 3000, h: 1500},
                        dimensions: {w: 40, h: 60},
                        collisionPadding: 40, // distance from center point to start collision detection
                        velocity: {x: 0, y: 0},
                        rank: 0,
                        color: 3,
                        level: 0,
                        health: 100,
                        connected: true,
                        id: tryId,
                        name: d.n,
                        type: d.t,
                        x: (emptySpot.x * Game.mapConfig.units) + (Game.mapConfig.units / 2),
                        y: (emptySpot.y * Game.mapConfig.units) + (Game.mapConfig.units / 2),
                        direction: 0,
                        thruster: 2,
                        weapon: 2,
                        message: ''};

                    console.log(Game.players);
                    ws.sendObj({m:'go', id: tryId, players: Game.getPlayers(), block: Game.mapConfig.units, map: Game.map});

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
            Game.players['p' + ws.playerId].connected = false;
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

            //Map
            this.mapConfig = {};
            this.mapConfig.numBlocks = 80;
            this.mapConfig.width = this.mapConfig.numBlocks;//blocks
            this.mapConfig.height = this.mapConfig.numBlocks;//blocks
            this.mapConfig.blank = 80;//percent of empty blocks
            this.mapConfig.bonus = 1;//percent of bonus blocks
            this.mapConfig.units = 200;//how many units wide and high is a block
            this.map = [];
            for(var i=0; i<this.mapConfig.width; i++){
                this.map[i] = [];
                for(var k=0; k<this.mapConfig.height; k++) {
                    var r = Math.random() * 100;
                    if (r < this.mapConfig.blank){
                        this.map[i][k] = 0;
                    } else if (r < this.mapConfig.blank + this.mapConfig.bonus)
                        this.map[i][k] = 10 + Math.floor(Math.random() * 10);
                    else
                        this.map[i][k] = Math.ceil(Math.random() * 6)
                }
            }

            // Tweakable
            this.loopDelay = 1000/20;//20 ticks per second

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

            this.artificioalLoad = 10;

            // Start the game loop
            this.loop();
        }

        static getPlayers(){
            var x = [];
            for(var key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype
                x.push({
                    id: this.players[key].id,
                    name: this.players[key].name,
                    type: this.players[key].type,
                    color: this.players[key].color,
                    rank: this.players[key].rank})
            }
            return x;
        }

        static playerSendData(){//id xyd health level
            var x = [];
            for(var key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype
                x.push([
                    this.players[key].id,
                    Math.floor(this.players[key].x),
                    Math.floor(this.players[key].y),
                    this.players[key].direction,
                    this.players[key].health,
                    this.players[key].level])
            }
            return x;
        }
        static playerSendDataToBinary(sendData){
            var length = sendData.length * sendData[0].length;

            length += 2; // for type and array length

            var x = new Int16Array(length);

            x[0] = 7;// type of packet, 7=player location data
            x[1] = sendData[0].length;// length of each element in array

            var cursor = 2;

            sendData.forEach(function(element, index){
                sendData[index].forEach(function(e,i){
                    x[cursor] = sendData[index][i];
                    cursor++;
                });
            });

            return x;
        }

        static getMapEmpty(){
            var v = 1;
            var x = 0;
            var y = 0;
            while(v > 0){
                x = Math.floor(Math.random() * this.mapConfig.width);
                y = Math.floor(Math.random() * this.mapConfig.height);

                v = this.map[y][x];
            }
            return {x: x, y: y};
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

            // Main Code


            var masterPlayerData = this.playerSendData();// data about players to be sent to players

            for(var key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype
                var sendToPlayer = {};

                // Update location
                if(this.players[key].thruster != 2){
                    this.players[key].velocity.x += Math.cos(this.players[key].direction / 1000) * 1.5;
                    this.players[key].velocity.y += Math.sin(this.players[key].direction / 1000) * 1.5;
                }
                if(this.players[key].thruster == 3){// 3 is when you click on and off in the same frame
                    this.players[key].thruster = 2;// register the click then unclick
                }
                this.players[key].velocity.x *= 0.99;
                this.players[key].velocity.y *= 0.99;
                this.players[key].x += this.players[key].velocity.x;
                this.players[key].y += this.players[key].velocity.y;

                // Check collisiton with blocks
                var qStart = Date.now();
                var q = 0;
                while(q <1){




                    var plX = this.players[key].x,
                        plY = this.players[key].y,
                        plR = this.players[key].direction/1000,
                        plCol = this.players[key].collisionPadding,
                        blockSize = this.mapConfig.units,
                        collPoints = [
                            {x: plX - plCol, y: plY - plCol},
                            {x: plX + plCol, y: plY - plCol},
                            {x: plX + plCol, y: plY + plCol},
                            {x: plX - plCol, y: plY + plCol}
                        ];


                    // check what is in the block at each point
                    // collision is possible if a block is not empty
                    // this only works because the ship is smaller than the block
                    collPoints.forEach((e,i)=>{
                        var xToCell = Math.floor(e.x / blockSize),
                            yToCell = Math.floor(e.y / blockSize);

                        if(typeof this.map[yToCell] == 'undefined' || typeof this.map[yToCell][xToCell] == 'undefined'){
                            console.log('Possible out of bounds');
                        }else if(this.map[yToCell][xToCell] != 0){
                            //Possible collision, finer calculation needed.
                            var ship = {width: this.players[key].dimensions.w, height: this.players[key].dimensions.h},
                                shipX = {point: (ship.height / 3) * 2, left: -(ship.height / 3), right: -(ship.height / 3)},
                                shipY = {point: 0, left: -(ship.width / 2), right: (ship.width / 2)},
                                blockPoints = [
                                    {x: xToCell * blockSize, y: yToCell * blockSize},
                                    {x: xToCell * blockSize + blockSize, y: yToCell * blockSize},
                                    {x: xToCell * blockSize + blockSize, y: yToCell * blockSize + blockSize},
                                    {x: xToCell * blockSize, y: yToCell * blockSize + blockSize}
                                ],
                                collision = true,
                                intersecting = [false,false,false,false];

                            while(collision == true){
                                collision = false;

                                plX = this.players[key].x;
                                plY = this.players[key].y;

                                var shipPoints = [
                                    {x: plX + (shipX.point * Math.cos(plR) - shipY.point * Math.sin(plR)), y: plY  + (shipX.point * Math.sin(plR) + shipY.point * Math.cos(plR))},
                                    {x: plX + (shipX.left * Math.cos(plR) - shipY.left * Math.sin(plR)), y: plY  + (shipX.left * Math.sin(plR) + shipY.left * Math.cos(plR))},
                                    {x: plX + (shipX.right * Math.cos(plR) - shipY.right * Math.sin(plR)), y: plY  + (shipX.right * Math.sin(plR) + shipY.right * Math.cos(plR))}
                                ];

                                shipPoints.forEach((element,index)=>{
                                    var x1 = shipPoints[index].x;
                                    var y1 = shipPoints[index].y;
                                    var i2 = (index + 1) % shipPoints.length;
                                    var x2 = shipPoints[i2].x;
                                    var y2 = shipPoints[i2].y;

                                    blockPoints.forEach((ele, ind)=>{
                                        var x3 = blockPoints[ind].x;
                                        var y3 = blockPoints[ind].y;
                                        var i3 = (ind + 1) % blockPoints.length;
                                        var x4 = blockPoints[i3].x;
                                        var y4 = blockPoints[i3].y;

                                        if(Lib.lineIntersects(x1,y1,x2,y2,x3,y3,x4,y4)){
                                            intersecting[ind] = true;
                                            collision = true;
                                        }
                                    });

                                });

                                //console.log(intersecting);


                                //Collision logic
                                if(intersecting[0]){
                                    this.players[key].y -= 1;
                                    if(this.players[key].velocity.y >= 0)
                                        this.players[key].velocity.y = 0;// remove velocity
                                }
                                if(intersecting[2]){
                                    this.players[key].y += 1;
                                    if(this.players[key].velocity.y <= 0)
                                        this.players[key].velocity.y = 0;// remove velocity
                                }

                                if(intersecting[1]){
                                    this.players[key].x += 1;
                                    if(this.players[key].velocity.x <= 0)
                                        this.players[key].velocity.x = 0;// remove velocity
                                }
                                if(intersecting[3]){
                                    this.players[key].x -= 1;
                                    if(this.players[key].velocity.x >= 0)
                                        this.players[key].velocity.x = 0;// remove velocity
                                }


                            }




                            //console.log('collision possible');
                        }
                    });



                    q++;
                }
                console.log(Date.now() - qStart);



                // Check players in view
                var screen = {};
                screen.top = this.players[key].y - this.players[key].view.h / 2;
                screen.left = this.players[key].x - this.players[key].view.w / 2;
                screen.right = this.players[key].x + this.players[key].view.w / 2;
                screen.bottom = this.players[key].y + this.players[key].view.h / 2;

                var playerDataCopy = Lib.deepCopy(masterPlayerData);
                for(var k=0; k<playerDataCopy.length; k++){
                    if(playerDataCopy[k][2] < screen.top){
                        playerDataCopy.splice(k,1);
                        k--;
                    }
                }
                for(k=0; k<playerDataCopy.length; k++){
                    if(playerDataCopy[k][2] > screen.bottom){
                        playerDataCopy.splice(k,1);
                        k--;
                    }
                }
                for(k=0; k<playerDataCopy.length; k++){
                    if(playerDataCopy[k][1] < screen.left){
                        playerDataCopy.splice(k,1);
                        k--;
                    }
                }
                for(k=0; k<playerDataCopy.length; k++){
                    if(playerDataCopy[k][1] > screen.right){
                        playerDataCopy.splice(k,1);
                        k--;
                    }
                }
                //playerDataCopy now holds all the players in view
                //sendToPlayer.p = playerDataCopy;

                if(this.players[key].connected)
                    this.players[key].ws.send(this.playerSendDataToBinary(playerDataCopy), {binary: true});


                // Make laser

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
            possible += possNum;

        for( var i=0; i < length; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    static lineIntersects(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y){
        var s1_x, s1_y, s2_x, s2_y;
        s1_x = p1_x - p0_x;
        s1_y = p1_y - p0_y;
        s2_x = p3_x - p2_x;
        s2_y = p3_y - p2_y;

        var s, t;
        s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
        t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

        if(s >= 0 && s <= 1 && t >= 0 && t <= 1)
            return true;// Collision detected

        return false; // No collision
    }

    static deepCopy(obj){
        return JSON.parse(JSON.stringify(obj));
    }
}
