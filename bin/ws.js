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
        gamePort = parseInt(port) + parseInt(WORKER_INDEX) + 1000,
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
        ws.connected = true;
        ws.sendObj = function (obj) {
            try{
                ws.send(JSON.stringify(obj));
            }catch(err){
                console.log(err);
            }
        };
        ws.sendBinary = function(data){
            try{
                ws.send(data, {binary: true});
            }catch(err){
                console.log(err);
            }
        };
        ws.on('message', function incoming(data) {
            try{
                var d = JSON.parse(data);

                if(typeof d[0] !== 'undefined'){
                    if(d[0] == 2 && typeof ws.playerId != 'undefined'){// player input

                        var plId = 'p' + ws.playerId;
                        if(Game.players[plId].health != 0){
                            if(d[1] != 0)
                                Game.players[plId].direction = parseInt(d[1]);
                            if(d[2] != 0)
                                Game.players[plId].thruster = parseInt(d[2]);
                            if(d[3] != 0)
                                Game.players[plId].weapon = parseInt(d[3]);
                        }

                        // Message
                        if(d[4] != 0 && typeof d[4] == 'string' && d[4].length > 0){
                            Game.players[plId].messageCount++;
                            Game.players[plId].messageData += d[4].length;

                            // Renew player message bank
                            Game.players[plId].messageBank += Math.floor((Date.now() - Game.players[plId].messageLast) / 10000);
                            Game.players[plId].messageLast = Date.now();
                            if(Game.players[plId].messageBank > 10)
                                Game.players[plId].messageBank = 10;


                            if(Game.players[plId].messageBank > 0){// Limit number of messages a player can send
                                Game.players[plId].messageBank--;

                                var modMessage = d[4].slice(0, 140);// cut the string short

                                var x = {m: "tm", id: ws.playerId, v: modMessage}; //Game.sendDataToBinary(6, [Lib.textToIntArray(modMessage, 127)], 8);

                                for(let key in Game.players) {
                                    if (!Game.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                                    if(Game.players[key].color == Game.players[plId].color && Game.players[key].connected && modMessage.length > 0){
                                        Game.players[key].ws.sendObj(x);
                                    }

                                }
                            }else{// player is out of messages
                                if(Game.players[plId].connected)
                                    Game.players[plId].ws.sendObj({m: 'oom'});
                            }
                        }
                        // end message

                    }

                }else if(d.m == "start"){
                    var emptySpot = Game.getMapEmpty();
                    var tryId = Lib.randString(4, false, false, true);
                    while(typeof Game.players['p' + tryId] !== 'undefined'){
                        tryId = Lib.randString(4, false, false, true);
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
                        score: 10,
                        color: Math.ceil(Math.random() * 6),
                        level: 0,
                        health: 1000,
                        maxHealth: 1000,
                        defense: 1, // 0=no damage, 1=all damage
                        connected: true,
                        id: tryId,
                        name: (d.n == ''? 'Nameless' + tryId: d.n),
                        type: d.t,
                        x: 100,//(emptySpot.x * Game.mapConfig.units) + (Game.mapConfig.units / 2),
                        y: 100, //(emptySpot.y * Game.mapConfig.units) + (Game.mapConfig.units / 2),
                        direction: 0,
                        thruster: 2,
                        topSpeed: 30,
                        weapon: 2,
                        weaponSpeed: 1000/2,
                        weaponLockout: Date.now(),
                        weaponDistance: 1500,
                        weaponDamage: 100,
                        weaponHeal: 100,
                        bonus: {thruster: false, weapon: false},
                        bonusTimeout: 5000, //miliseconds
                        lastActive: Date.now(),
                        messageData: 0,
                        messageBank: 5,
                        messageLast: Date.now(),
                        messageCount: 0};

                    // Mod stats for class
                    if(Game.players['p' + tryId].type == 0){// Strength type
                        Game.players['p' + tryId].weaponDamage = Math.floor(Game.players['p' + tryId].weaponDamage * 1.5);
                    }else if(Game.players['p' + tryId].type == 1){// Heal type
                        Game.players['p' + tryId].weaponDamage = Math.floor(Game.players['p' + tryId].weaponDamage * 0.66);
                        Game.players['p' + tryId].weaponSpeed = Math.floor(Game.players['p' + tryId].weaponSpeed / 1.5);
                    }else if(Game.players['p' + tryId].type == 2){// Tank type
                        Game.players['p' + tryId].defense *= 0.66;
                    }

                    // update player number
                    Game.numPlayers++;

                    // Generate new rank list
                    Game.genRankList = true;

                    ws.sendObj({m:'go', id: tryId, players: Game.getPlayers(), block: Game.mapConfig.units, map: Game.map, tick: Game.loopDelay, minitick: Game.minimapDelay});
                    wss.broadcast(JSON.stringify({m: 'newplayer', v: Game.getSinglePlayer(tryId)}));

                }else if(d.m == 'compatible'){
                    if(compatible == d.v){
                        ws.sendObj({m: 'ready'});
                    }else{
                        ws.sendObj({m: 'compatible', v: false});
                    }

                }else if(d.m == 'respawn'){
                    if(typeof ws.playerId !== 'undefined' && typeof Game.players['p' + ws.playerId] !== 'undefined' && Game.players['p' + ws.playerId].health == 0){

                        // Respawn
                        var emptyBlock = Game.getMapEmpty();
                        Game.players['p' + ws.playerId].x = emptyBlock.x * Game.mapConfig.units + (Game.mapConfig.units/2);
                        Game.players['p' + ws.playerId].y = emptyBlock.y * Game.mapConfig.units + (Game.mapConfig.units/2);
                        Game.players['p' + ws.playerId].health = Game.players['p' + ws.playerId].maxHealth;
                        Game.players['p' + ws.playerId].velocity.x = 0;
                        Game.players['p' + ws.playerId].velocity.y = 0;
                    }
                }else if(d.m == 'ping'){
                    ws.sendObj(d);
                }
            }
            catch(err){
                if (__DEV)console.log('Bad Packet: ', data, err);
            }
        });

        ws.on('close', function(){
            ws.connected = false;
            if(typeof ws.playerId == 'undefined' || typeof Game.players['p' + ws.playerId] == 'undefined') return false;

            Game.players['p' + ws.playerId].connected = false;
            if(Game.players['p' + ws.playerId].health == 0){
                Game.removePlayer(ws.playerId);
            }
        });

        ws.sendObj({m: 'hi'});
    });

    wss.broadcast = function broadcast(data) {
        wss.clients.forEach(function each(client) {
            try{
                if(client.connected)
                    client.send(data);
            }catch(err){
                console.log(err);
            }

        });
    };

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
            this.ready = false;
            // Game data
            this.genRankList = false;
            this.maxPlayers = 60;
            this.numPlayers = 0;
            this.players = {};

            //Map
            this.mapConfig = {};
            this.mapConfig.blocksPerPerson = 100;
            this.mapConfig.numBlocks = Math.floor(Math.sqrt(this.maxPlayers * this.mapConfig.blocksPerPerson));//(150 MAX because of int 16 ArrayBuffer  150*blockSize 200 = 30,000 this leaves room for lasers to go into the black)
            this.mapConfig.width = this.mapConfig.numBlocks;//all maps will have the same width and height (square)
            this.mapConfig.height = this.mapConfig.numBlocks;//blocks
            this.mapConfig.area = this.mapConfig.numBlocks * this.mapConfig.numBlocks;//blocks
            this.mapConfig.units = 200;//how many units wide and high is a block
            this.map = [];
            this.mapHealth = [];
            for(let i=0; i<this.mapConfig.width; i++){
                this.map[i] = [];
                this.mapHealth[i] = [];
                for(let k=0; k<this.mapConfig.height; k++) {
                    this.map[i][k] = 0;// blank
                    this.mapHealth[i][k] = 0;
                }
            }
            var colorBlockOneOutOf = 50;
            var bonusBlockOneOutOf = 2000;
            var mapItems = [
                {value: 1, amount: Math.floor(this.mapConfig.area / colorBlockOneOutOf)},
                {value: 2, amount: Math.floor(this.mapConfig.area / colorBlockOneOutOf)},
                {value: 3, amount: Math.floor(this.mapConfig.area / colorBlockOneOutOf)},
                {value: 4, amount: Math.floor(this.mapConfig.area / colorBlockOneOutOf)},
                {value: 5, amount: Math.floor(this.mapConfig.area / colorBlockOneOutOf)},
                {value: 6, amount: Math.floor(this.mapConfig.area / colorBlockOneOutOf)},

                {value: 21, amount: Math.ceil(this.mapConfig.area / bonusBlockOneOutOf)},
                {value: 22, amount: Math.ceil(this.mapConfig.area / bonusBlockOneOutOf)},
                {value: 23, amount: Math.ceil(this.mapConfig.area / bonusBlockOneOutOf)},
                {value: 24, amount: Math.ceil(this.mapConfig.area / bonusBlockOneOutOf)}
            ];
            mapItems.forEach((e,i)=>{
                for(let w=0; w<e.amount; w++){
                    var fillBlock = this.getMapEmpty();
                    this.map[fillBlock.y][fillBlock.x] = e.value;
                    this.mapHealth[fillBlock.y][fillBlock.x] = 100;

                }
            });

            // TimingbonusBlockOneOutOf
            this.loopDelay = 1000/20;//20 ticks per second
            this.minimapDelay = this.loopDelay * 4;// every 4 ticks

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

            // Start the game loop
            this.loop();
            this.ready = true;
        }

        static removePlayer(id){
            // delete player from server
            delete this.players['p' + id];
            this.numPlayers--;
            // delete player from client
            wss.broadcast(JSON.stringify({m: 'dcplayer', v: id}));
        }

        static getPlayers(){// name type etc..
            var x = {};
            for(var key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype
                x['p' + this.players[key].id] = {
                    id: this.players[key].id,
                    name: this.players[key].name,
                    type: this.players[key].type,
                    color: this.players[key].color,
                    rank: this.players[key].rank
                };
            }
            return x;
        }
        static getSinglePlayer(id){
            return {
                id: this.players['p' + id].id,
                name: this.players['p' + id].name,
                type: this.players['p' + id].type,
                color: this.players['p' + id].color,
                rank: this.players['p' + id].rank
            };
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
                    this.players[key].health])
            }
            return x;
        }

        static sendDataToBinary(idNum, arrayOfIntArrays, bitSize){

            if(arrayOfIntArrays.length < 1 || arrayOfIntArrays[0].length < 1){
                var ifFalse = new Int8Array(1);
                ifFalse[0] = 0;
                return ifFalse;
            }

            var length = arrayOfIntArrays.length * arrayOfIntArrays[0].length;

            length += 2; // for type and array length

            var x = new Int16Array(length);
            if(bitSize == 8) x = new Int8Array(length);
            if(bitSize == 32) x = new Int32Array(length);

            x[0] = idNum;// type of packet, 8=laser
            x[1] = arrayOfIntArrays[0].length;// length of each element in array

            var cursor = 2;

            arrayOfIntArrays.forEach(function(element, index){
                arrayOfIntArrays[index].forEach(function(e,i){
                    x[cursor] = arrayOfIntArrays[index][i];
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

        static getServerLoad(JSON){
            if (JSON)
                return {
                    't': this.serverLoad.tps,
                    'a': this.serverLoad.current,
                    'h': this.serverLoad.high,
                    'l': this.serverLoad.low
                };
            else
                return 'tps: ' + this.serverLoad.tps + ' Average: ' + this.serverLoad.current + '% High: ' + this.serverLoad.high + '% Low: ' + this.serverLoad.low + '% (percent of one core used per tick)';
        }

        static killPrize(x, y, distance, color, score){
            for(let key in this.players){
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                if(this.players[key].color == color){
                    if(Lib.distance(x, y, this.players[key].x, this.players[key].y) < distance)
                        this.players[key].score = Math.floor(this.players[key].score + score);
                }
            }
        }

        static rankPlayers(){
            // sort players by score
            // update rank to the sort order
            // update player level based on rank
            // send to everyone on player join and death
            var sortingArr = [];
            for(let key in this.players){
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype
                sortingArr.push({score: this.players[key].score, player: this.players[key]});
            }

            sortingArr.sort(function(a, b){
                if(a.score < b.score)
                    return 1;
                if (a.score > b.score)
                    return -1;
                return 0;// a must be equal to b
            });

            sortingArr.forEach((e, i)=>{
                sortingArr[i].player.rank = i + 1;// +1 to offset index of 0
            });


            var levelMax = 1000;
            var step = levelMax/this.maxPlayers;
            var idLevelScoreSend = [];
            for(let key in this.players){
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                this.players[key].level = Math.floor((this.numPlayers + 1 - this.players[key].rank) * step);
                idLevelScoreSend.push([this.players[key].id, this.players[key].rank, this.players[key].level]);
            }
            return idLevelScoreSend;
        }

        static loop() {
            setTimeout(()=> {
                setTimeout(()=> {
                    this.loop()
                }, 1);
            }, this.loopDelay);
            var tickDate = Date.now();
            this.lastLoop = tickDate;
            this.loopCount++;


            // Executed once per real second
            if (tickDate - this.lastSecond > 1000) {
                this.lastSecond = tickDate;
            }

            // Main Code
            var laserList = [];
            var blocksChanged = [];
            var rankList = [];

            //Update player location
            for(let key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                var bonusThrust = 1;
                if(this.players[key].bonus.thruster !== false){
                    if(tickDate - this.players[key].bonus.thruster > this.players[key].bonusTimeout)
                        this.players[key].bonus.thruster = false;
                    else
                        bonusThrust = 2;
                }

                // turn on thrusters
                if(this.players[key].thruster != 2){
                    this.players[key].velocity.x += Math.cos(this.players[key].direction / 1000) * (1.5 * bonusThrust);
                    this.players[key].velocity.y += Math.sin(this.players[key].direction / 1000) * (1.5 * bonusThrust);

                    if(this.players[key].thruster == 3){// 3 is when you click on and off in the same frame
                        this.players[key].thruster = 2;// register the click then unclick
                    }
                }

                // Update location
                this.players[key].velocity.x *= 0.98;
                this.players[key].velocity.y *= 0.98;
                var newSpeed = Math.abs(Lib.distance(0,0,this.players[key].velocity.x,this.players[key].velocity.y));
                if(newSpeed > this.players[key].topSpeed){
                    // - (0.025 * (Math.abs(this.players[key].velocity.x) / this.players[key].topSpeed));
                    this.players[key].velocity.x *= 0.97;
                    this.players[key].velocity.y *= 0.97;
                    newSpeed = Math.abs(Lib.distance(0,0,this.players[key].velocity.x,this.players[key].velocity.y));
                }
                this.players[key].x += this.players[key].velocity.x;
                this.players[key].y += this.players[key].velocity.y;

                // Check collisiton with blocks
                let plX = this.players[key].x,
                    plY = this.players[key].y,
                    plR = this.players[key].direction/1000,
                    plCol = this.players[key].collisionPadding,
                    collPoints = [
                        {x: plX - plCol, y: plY - plCol},
                        {x: plX + plCol, y: plY - plCol},
                        {x: plX + plCol, y: plY + plCol},
                        {x: plX - plCol, y: plY + plCol}
                    ];

                let blockSize = this.mapConfig.units;


                // check what is in the block at each point
                // collision is possible if a block is not empty
                // this only works because the ship is smaller than the block
                collPoints.forEach((e,i)=>{
                    var xToCell = Math.floor(e.x / blockSize),
                        yToCell = Math.floor(e.y / blockSize);

                    if(typeof this.map[yToCell] == 'undefined' || typeof this.map[yToCell][xToCell] == 'undefined'){
                        //console.log('Possible out of bounds');
                        while(this.players[key].x <= 0){
                            this.players[key].x++;
                            this.players[key].velocity.x = 0;
                        }
                        while(this.players[key].x >= this.mapConfig.numBlocks * this.mapConfig.units){
                            this.players[key].x--;
                            this.players[key].velocity.x = 0;
                        }
                        while(this.players[key].y <= 0){
                            this.players[key].y++;
                            this.players[key].velocity.y = 0;
                        }
                        while(this.players[key].y >= this.mapConfig.numBlocks * this.mapConfig.units){
                            this.players[key].y--;
                            this.players[key].velocity.y = 0;
                        }
                    }else if(this.map[yToCell][xToCell] != 0 && this.map[yToCell][xToCell] != this.players[key].color){ // color block
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

                            if(collision == true && this.map[yToCell][xToCell] > 20 && this.map[yToCell][xToCell] < 30) {// Bonus
                                var bonusNumber = this.map[yToCell][xToCell];

                                // Move the block
                                var blockEmpty = this.getMapEmpty();
                                this.map[blockEmpty.y][blockEmpty.x] = this.map[yToCell][xToCell];
                                this.map[yToCell][xToCell] = 0;
                                blocksChanged.push([blockEmpty.x, blockEmpty.y, this.map[blockEmpty.y][blockEmpty.x]]);
                                blocksChanged.push([xToCell, yToCell, this.map[yToCell][xToCell]]);
                                collision = false;


                                // Grant the bonus
                                if(bonusNumber == 21){//health
                                    this.players[key].health = this.players[key].maxHealth;
                                }else if(bonusNumber == 22){//warp
                                    var warpTo = this.getMapEmpty();
                                    var blockUnite = this.mapConfig.units;
                                    this.players[key].x = (warpTo.x * blockUnite) + (blockUnite/2);
                                    this.players[key].y = (warpTo.y * blockUnite) + (blockUnite/2);
                                }else if(bonusNumber == 23){//thruster
                                    this.players[key].bonus.thruster = Date.now();
                                }else if(bonusNumber == 24){//weapon
                                    this.players[key].bonus.weapon = Date.now();
                                }


                            }else{// colored block
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




                        }

                        //console.log('collision possible');
                    }
                });

            }

            // Make laser
            for(let key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                if(this.players[key].weapon !=2){
                    if(tickDate >= this.players[key].weaponLockout){

                        var bonusSpeed = 1;
                        if(this.players[key].bonus.weapon !== false){
                            if(tickDate - this.players[key].bonus.weapon > this.players[key].bonusTimeout)
                                this.players[key].bonus.weapon = false;
                            else
                                bonusSpeed = 2;
                        }
                        this.players[key].weaponLockout = tickDate + Math.floor(this.players[key].weaponSpeed / bonusSpeed);

                        var laser = [];
                        laser[0] = this.players[key].x + Math.cos(this.players[key].direction / 1000) * this.players[key].collisionPadding;
                        laser[1] = this.players[key].y + Math.sin(this.players[key].direction / 1000) * this.players[key].collisionPadding;

                        laser[2] = this.players[key].x + Math.cos(this.players[key].direction / 1000) * this.players[key].weaponDistance;
                        laser[3] = this.players[key].y + Math.sin(this.players[key].direction / 1000) * this.players[key].weaponDistance;

                        laser[4] = this.players[key].id;


                        // Laser collision with block
                        //check collision with block
                        //cut laser short on collision
                        let blockSize = this.mapConfig.units;
                        let smallestBlockX = Math.floor((laser[0] < laser[2] ? laser[0] : laser[2]) / blockSize);// simplified to block level coordinates
                        let smallestBlockY = Math.floor((laser[1] < laser[3] ? laser[1] : laser[3]) / blockSize);
                        let largestBlockX = Math.floor((laser[0] < laser[2] ? laser[2] : laser[0]) / blockSize);
                        let largestBlockY = Math.floor((laser[1] < laser[3] ? laser[3] : laser[1]) / blockSize);
                        let blockHit = false;
                        for(var x=smallestBlockX; x<=largestBlockX; x++){
                            for(var y=smallestBlockY; y<=largestBlockY; y++){
                                if(typeof  this.map[y] == 'undefined' || typeof this.map[y][x] == 'undefined'){
                                    // out of bountd
                                }else{
                                    if(this.map[y][x] != 0){
                                        // laser hit a non empty block
                                        var blockPoints = [
                                            {x: x * blockSize, y: y * blockSize},
                                            {x: x * blockSize + blockSize, y: y * blockSize},
                                            {x: x * blockSize + blockSize, y: y * blockSize + blockSize},
                                            {x: x * blockSize, y: y * blockSize + blockSize}
                                        ];
                                        blockPoints.forEach((e,i)=>{
                                            var e2 = blockPoints[(i+1) % blockPoints.length];
                                            //basic line intersection
                                            if(Lib.lineIntersects(e.x, e.y, e2.x, e2.y, laser[0], laser[1], laser[2], laser[3])){
                                                // find the exact point of intersection
                                                var q = Lib.lineIntersectsPoint(e.x, e.y, e2.x, e2.y, laser[0], laser[1], laser[2], laser[3]);
                                                if(q.onLine1 == true && q.onLine2 == true){
                                                    //cut the laser short
                                                    laser[2] = q.x;
                                                    laser[3] = q.y;
                                                    blockHit = {x: x, y: y};
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        }


                        //check collision with player
                        //cut laser short on collision
                        //remove health from player / check death / recalculate points / recalculate topcharts

                        let smallestLaserX = (laser[0] < laser[2] ? laser[0] : laser[2]);// full map level coordinates
                        let smallestLaserY = (laser[1] < laser[3] ? laser[1] : laser[3]);
                        let largestLaserX = (laser[0] < laser[2] ? laser[2] : laser[0]);
                        let largestLaserY = (laser[1] < laser[3] ? laser[3] : laser[1]);
                        let playerHit = false;
                        for(let ky in this.players) {
                            if(!this.players.hasOwnProperty(ky)) continue;// skip loop if the property is from prototype
                            if(this.players[ky].health == 0) continue;// dead

                            var pad = this.players[ky].collisionPadding;

                            if(this.players[key].id != this.players[ky].id){
                                if(this.players[ky].x > smallestLaserX - pad && this.players[ky].x < largestLaserX + pad){
                                    if(this.players[ky].y > smallestLaserY - pad && this.players[ky].y < largestLaserY + pad){
                                        //player is in range to be hit
                                        let ship = {width: this.players[ky].dimensions.w, height: this.players[ky].dimensions.h},
                                            shipX = {point: (ship.height / 3) * 2, left: -(ship.height / 3), right: -(ship.height / 3)},
                                            shipY = {point: 0, left: -(ship.width / 2), right: (ship.width / 2)},
                                            plX = this.players[ky].x,
                                            plY = this.players[ky].y,
                                            plR = this.players[ky].direction/1000,
                                            shipPoints = [
                                                {x: plX + (shipX.point * Math.cos(plR) - shipY.point * Math.sin(plR)), y: plY  + (shipX.point * Math.sin(plR) + shipY.point * Math.cos(plR))},
                                                {x: plX + (shipX.left * Math.cos(plR) - shipY.left * Math.sin(plR)), y: plY  + (shipX.left * Math.sin(plR) + shipY.left * Math.cos(plR))},
                                                {x: plX + (shipX.right * Math.cos(plR) - shipY.right * Math.sin(plR)), y: plY  + (shipX.right * Math.sin(plR) + shipY.right * Math.cos(plR))}
                                            ];

                                        shipPoints.forEach((e,i)=>{
                                            var e2 = shipPoints[(i+1) % shipPoints.length];
                                            //basic line intersection
                                            if(Lib.lineIntersects(e.x, e.y, e2.x, e2.y, laser[0], laser[1], laser[2], laser[3])){
                                                // find the exact point of intersection
                                                var q = Lib.lineIntersectsPoint(e.x, e.y, e2.x, e2.y, laser[0], laser[1], laser[2], laser[3]);
                                                if(q.onLine1 == true && q.onLine2 == true){
                                                    //cut the laser short
                                                    laser[2] = q.x;
                                                    laser[3] = q.y;
                                                    blockHit = false;
                                                    playerHit = this.players[ky].id;
                                                }
                                            }
                                        });
                                    }
                                }
                            }


                        }




                        // in response to collision
                        if(blockHit !== false){
                            if(this.map[blockHit.y][blockHit.x] > 20 && this.map[blockHit.y][blockHit.x] < 30){//bonus
                                // bonus
                            }else{// colored block
                                this.mapHealth[blockHit.y][blockHit.x] -= 5;

                                if(this.mapHealth[blockHit.y][blockHit.x] <= 0){
                                    var blockEmpty = this.getMapEmpty();
                                    this.map[blockEmpty.y][blockEmpty.x] = this.map[blockHit.y][blockHit.x];
                                    this.mapHealth[blockEmpty.y][blockEmpty.x] = 100;
                                    this.map[blockHit.y][blockHit.x] = 0;
                                    this.mapHealth[blockHit.y][blockHit.x] = 0;
                                    blocksChanged.push([blockEmpty.x, blockEmpty.y, this.map[blockEmpty.y][blockEmpty.x]]);
                                    blocksChanged.push([blockHit.x, blockHit.y, this.map[blockHit.y][blockHit.x]]);
                                }
                            }
                        }

                        if(playerHit !== false){
                            if(this.players['p' + playerHit].color == this.players[key].color){// heal
                                this.players['p' + playerHit].health = Math.floor(this.players['p' + playerHit].health + this.players[key].weaponHeal);
                                if(this.players['p' + playerHit].health > this.players['p' + playerHit].maxHealth)
                                    this.players['p' + playerHit].health = this.players['p' + playerHit].maxHealth;
                            }else{// damage
                                this.players['p' + playerHit].health = Math.floor(this.players['p' + playerHit].health - (this.players[key].weaponDamage * this.players['p' + playerHit].defense));


                                if(this.players['p' + playerHit].health <= 0){// death

                                    // killer prize
                                    this.players[key].health = this.players[key].maxHealth;
                                    this.killPrize(this.players[key].x, this.players[key].y, this.players[key].weaponDistance, this.players[key].color, this.players['p' + playerHit].score / 2);
                                    if(this.players[key].connected)
                                        this.players[key].ws.sendObj({m: 'killed', v: this.players['p' + playerHit].name});

                                    // Dead man
                                    this.players['p' + playerHit].health = 0;
                                    this.players['p' + playerHit].velocity.x = 0;
                                    this.players['p' + playerHit].velocity.y = 0;
                                    this.players['p' + playerHit].score = 10;
                                    this.players['p' + playerHit].weapon = 2;
                                    this.players['p' + playerHit].thruster = 2;
                                    this.players['p' + playerHit].lastActive = Date.now();
                                    if(this.players['p' + playerHit].connected)
                                        this.players['p' + playerHit].ws.sendObj({m: 'dead'});

                                    // remove dc players on death
                                    if(this.players['p' + playerHit].connected == false){
                                        Game.removePlayer(playerHit);
                                    }

                                    // process the new scores.
                                    this.genRankList = true;
                                }
                            }

                        }

                        laserList.push(laser);
                    }

                    if(this.players[key].weapon == 3){// 3 is when you click on and off in the same frame
                        this.players[key].weapon = 2;// register the click then unclick
                    }
                }
            }

            // Send player/laser location data
            var masterPlayerData = this.playerSendData();// data about players to be sent to players
            for(let key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                // Check players in view
                let screen = {};
                screen.top = this.players[key].y - this.players[key].view.h / 2;
                screen.left = this.players[key].x - this.players[key].view.w / 2;
                screen.right = this.players[key].x + this.players[key].view.w / 2;
                screen.bottom = this.players[key].y + this.players[key].view.h / 2;

                // Player location
                let dataToSend = [];
                masterPlayerData.forEach((e,i)=>{
                    if(e[2] > screen.top && e[2] < screen.bottom && e[1] > screen.left && e[1] < screen.right){
                        dataToSend.push(e);
                    }
                });
                if (this.players[key].connected && dataToSend.length > 0)
                    this.players[key].ws.sendBinary(this.sendDataToBinary(7, dataToSend, 16));

                // Lasers
                let lasersToSend = [];
                laserList.forEach((e,i)=>{
                    if(e[1] > screen.top && e[1] < screen.bottom && e[0] > screen.left && e[0] < screen.right){
                        lasersToSend.push(e);
                    }else if(e[3] > screen.top && e[3] < screen.bottom && e[2] > screen.left && e[2] < screen.right){
                        lasersToSend.push(e);
                    }
                });
                if(this.players[key].connected && lasersToSend.length > 0)
                    this.players[key].ws.sendBinary(this.sendDataToBinary(8, lasersToSend, 16));

            }


            // Send block changes / level rank
            if(this.genRankList === true){
                rankList = this.rankPlayers();
                this.genRankList = false;
            }
            for(let key in this.players) {
                if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                if(this.players[key].connected && blocksChanged.length > 0)
                    this.players[key].ws.sendBinary(this.sendDataToBinary(9, blocksChanged, 16));

                if(this.players[key].connected && rankList.length > 0)// sent when someone joins or dies.
                    this.players[key].ws.sendBinary(this.sendDataToBinary(5, rankList, 16));

            }


            // Minimap
            //executes twice per second
            if (this.loopCount % (this.minimapDelay / this.loopDelay) == 0) {
                // Get x,y for minimap
                var minimapColors = [];
                for(let key in this.players) {
                    if(!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                    if(this.players[key].health == 0) continue;// skip dead players
                    let color = this.players[key].color;
                    if(typeof minimapColors[color] == 'undefined')
                        minimapColors[color] = [];

                    minimapColors[color].push([Math.floor(this.players[key].x), Math.floor(this.players[key].y), this.players[key].id]);
                }
                var minimapData = [];
                minimapColors.forEach((e,i)=>{
                    minimapData[i] = this.sendDataToBinary(6, minimapColors[i], 16);
                });

                for(let key in this.players) {
                    if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                    let color = this.players[key].color;
                    if(this.players[key].connected && this.players[key].health != 0 && typeof minimapData[color] !== 'undefined')
                        this.players[key].ws.sendBinary(minimapData[color]);

                }
            }





            // === Server load
            var endTickDate = Date.now();
            var computeTime = endTickDate - this.lastLoop;
            var loadPercent = Math.round((100 / this.loopDelay) * computeTime);
            this.serverLoad.tick.push(loadPercent);
            // Executed once per game second
            if (this.loopCount % (1000 / this.loopDelay) == 0) {
                this.serverLoad.current = this.serverLoad.tick.reduce((a, b) => a + b, 0) / this.serverLoad.tick.length;
                this.serverLoad.low = this.serverLoad.tick.reduce((a, b) => a < b ? a : b);
                this.serverLoad.high = this.serverLoad.tick.reduce((a, b) => a > b ? a : b);
                this.serverLoad.tick = [];


                // Ticks per second
                var timeLastSec = endTickDate - this.serverLoad.lastSecond;
                this.serverLoad.lastSecond = endTickDate;
                this.serverLoad.tps = (1000 / timeLastSec) * (1000 / this.loopDelay);

                //console.log(this.getServerLoad(false));
            }
            // Executes one per game minute
            if (this.loopCount % (60000 / this.loopDelay) == 0) {

                // Kick player if they have been dead for 10 minutes
                var curDate = Date.now();
                for(let key in this.players) {
                    if (!this.players.hasOwnProperty(key)) continue;// skip loop if the property is from prototype
                    if(curDate - this.players[key].lastActive > 600000 && this.players[key].connected && this.players[key].health == 0){
                        this.players[key].ws.sendObj({m: 'timeout', v: curDate});
                        this.players[key].ws.connected = false;
                        this.players[key].ws.close();
                    }
                }

                // Output the server load onece per minute
                console.log(Game.getServerLoad());
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

    // fast, true or false
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

    // slow with more detail
    static lineIntersectsPoint(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
        // http://jsfiddle.net/justin_c_rounds/Gd2S2/
        var denominator, a, b, numerator1, numerator2, result = {
            x: null,
            y: null,
            onLine1: false,
            onLine2: false
        };

        denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
        if(denominator == 0)
            return result;

        a = line1StartY - line2StartY;
        b = line1StartX - line2StartX;
        numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
        numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
        a = numerator1 / denominator;
        b = numerator2 / denominator;

        result.x = line1StartX + (a * (line1EndX - line1StartX));
        result.y = line1StartY + (a * (line1EndY - line1StartY));

        if(a > 0 && a < 1)
            result.onLine1 = true;
        if(b > 0 && b < 1)
            result.onLine2 = true;

        return result;
    };

    static distance(x1, y1, x2, y2){
        return Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
    }

    static textToIntArray(text, cutoff){
        var x = [];
        for(var i=0; i<text.length; i++){
            var q = text.charCodeAt(i);
            if(q <= cutoff)
                x.push(q);
        }
        return x;
    }

    static deepCopy(obj){
        return JSON.parse(JSON.stringify(obj));
    }
}
