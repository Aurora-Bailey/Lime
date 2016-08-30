// Main

class WebSocketClass {
    constructor(){
        this.server = 0;
        this.connected = false;
    }

    startWebSocket(){
        if(this.connected)//already connected.
            return false;

        if(__DEV){
            this.server = new WebSocket('ws://localhost:7777');
        }else {
            this.server = new WebSocket('ws://ws.' + __DOMAIN + '/');
        }

        this.server.binaryType = 'arraybuffer';

        this.server.onopen = () => {
            this.connected = true;
            this.sendObj({m: 'compatible', v: compatible});
        };
        this.server.onclose = () => {
            this.connected = false;
            PO.ready = false;
            $('#homepage').removeClass('hide');
            $('#maingame').addClass('hide');
            $('#chat-log').addClass('hide');
        };
        this.server.onmessage = (e) => {
            var d = e.data;
            if(typeof e.data == 'string'){
                d = JSON.parse(d);
                console.log(d);
                if(d.m == 'compatible'){
                    if(d.v == false) alert('Your game is out of date, try refreshing the browser.');
                }else if(d.m == 'ready'){
                    this.sendObj({m: 'start', n: PO.name, t: PO.type});
                }else if(d.m == 'go'){
                    Game.data.players.list = d.players;
                    Game.data.myId = d.id;
                    Game.data.map = d.map;
                    Game.data.serverTick = d.tick;
                    Game.data.minimapTick = d.minitick;
                    Game.data.config.blocksize = d.block;
                    Game.draw.map();
                    Game.draw.minimap();
                    PO.ready = true;
                    $('#homepage').addClass('hide');
                    $('#maingame').removeClass('hide');
                    $('#chat-log').removeClass('hide').html('');
                    Game.chatMessage("Press [Enter] to open/close chat.", 'game');
                    Game.chatMessage("You can only chat with " + Lib.numToColorNameProper(Game.data.players.list['p' + Game.data.myId].color) + " players.", 'game');
                    var playerId = d.id;
                }else if(d.m == 'dead'){
                    $('#respawn').removeClass('hide');
                    Game.chatMessage("You're Dead!", 'game');
                }else if(d.m == "killed"){
                    Game.chatMessage("You killed '" + d.v + "'", 'game');
                }else if(d.m == "dcplayer"){
                    if(typeof Game.data.players.list['p' + d.v] !== 'undefined')
                        delete Game.data.players.list['p' + d.v];
                }else if(d.m == "newplayer"){
                    Game.data.players.list['p' + d.v.id] = d.v;
                }else if(d.m == "oom"){
                    Game.chatMessage("You've sent too many messages (try again in 10 seconds)", 'game');
                }else if(d.m == "tm"){// Team Message
                    $('#chat-log').prepend(
                        $('<div />')
                            .addClass('team')
                            .addClass(Lib.numToColorNameProper(Game.data.players.list['p' + Game.data.myId].color).toLowerCase())
                            .text('[ ' + Game.data.players.list['p' + d.id].name + ' ]  ' + d.v)
                    );
                }else if(d.m == "ping"){
                    Game.chatMessage("Ping: " + (Date.now() - d.v) + "ms", 'game');
                }
            }else{
                var x = new Int8Array(d);

                if(x[0] == 6){
                    Game.data.oldPlayers.minimap = Game.data.players.minimap;
                    Game.data.players.minimap = WS.unpackBinary(d, 16);
                }

                if(x[0] == 7){// players location and direction
                    Game.data.oldPlayers.tick = Game.data.players.tick;
                    Game.data.players.tick = WS.unpackBinary(d, 16);
                    //Game.draw.players();
                }

                if(x[0] == 8){// laser location
                    Game.data.lasers = Game.data.lasers.concat(WS.unpackBinary(d, 16));
                    //Game.draw.lasers();
                }

                if(x[0] == 9){// block change
                    var blockChages = WS.unpackBinary(d, 16);
                    blockChages.forEach((e,i)=>{
                        var mapX = e[0],
                            mapY = e[1];
                        Game.data.map[mapY][mapX] = e[2];
                    });
                    Game.draw.map();
                    Game.draw.minimap();
                }

            }


        };
    }

    unpackBinary(data, bitSize){
        var binaryData = false;
        if(bitSize == 8) binaryData = new Int8Array(data);
        if(bitSize == 16) binaryData = new Int16Array(data);
        if(bitSize == 32) binaryData = new Int32Array(data);
        var currentDate = Date.now();
        var mainArray = [];
        var singleArray = [];
        for(var k=2; k<binaryData.length; k++){
            singleArray.push(binaryData[k]);
            if(singleArray.length == binaryData[1]){
                singleArray.push(currentDate);
                mainArray.push(singleArray);
                singleArray = [];
            }
        }
        return mainArray;
    }

    stopWebSocket(){
        if(this.connected){
            this.server.close();
        }
    }

    sendObj(object){
        if(this.connected == false){
            alert('WebSocket is not connected.');
            return false;
        }
        this.server.send(JSON.stringify(object));
    }
}
var WS = new WebSocketClass();

class PlayerOutput{
    constructor(){

        this.ready = false;

        // one time output
        this.name = '';
        this.type = 0;

        // chat
        this.chatMode = false;

        // click state
        this.thrusterState = false;
        this.weaponState = false;

        // Every tick
        this.tickEmpty = 0;
        this.tickchanged = false;
        this.tick = {};
        this.tick.direction = this.tickEmpty;
        this.tick.thruster = this.tickEmpty;
        this.tick.weapon = this.tickEmpty;
        this.tick.message = this.tickEmpty;

        // other
        this.loopDelay = 1000/20;
        this.harvestLoop();
    }

    thrust(on){
        if(on && this.thrusterState == false){
            PO.tick.thruster = 1;
            PO.thrusterState = true;
            PO.tickchanged = true;
        }else if(!on && this.thrusterState == true){
            if(PO.tick.thruster == 1)
                PO.tick.thruster = 3;
            else
                PO.tick.thruster = 2;
            PO.thrusterState = false;
            PO.tickchanged = true;
        }
    };
    weapon(on){
        if(on && this.weaponState == false){
            PO.tick.weapon = 1;
            PO.weaponState = true;
            PO.tickchanged = true;
        }else if(!on && this.weaponState == true){
            if(PO.tick.weapon == 1)
                PO.tick.weapon = 3;
            else
                PO.tick.weapon = 2;

            PO.weaponState = false;
            PO.tickchanged = true;
        }
    };

    harvestLoop(){
        setTimeout(()=> {
            setTimeout(()=> {
                this.harvestLoop();
            }, 1);
        }, this.loopDelay);

        if(this.tickchanged){
            //send data
            var tickArray = [2];
            for(var key in this.tick) {
                if (!this.tick.hasOwnProperty(key)) continue;// skip loop if the property is from prototype
                tickArray.push(this.tick[key]);
                this.tick[key] = this.tickEmpty;
            }
            if(WS.connected) WS.sendObj(tickArray);
            this.tickchanged = false;
        }

    }
}
var PO = new PlayerOutput();






class GameClass{
    constructor(){


        // Core
        this.center = {x: $(window).width() / 2, y: $(window).height() / 2};
        this.view = {x: 2000, y: 1000};// will be overwritten by game.zoom
        this.zoomLevel = 3;
        this.renderer = PIXI.autoDetectRenderer(this.view.x, this.view.y,{backgroundColor : 0x000000});
        this.renderer.baseResolution = {width: this.renderer.width, height: this.renderer.height};
        $('#maingame').append(this.renderer.view);

        // Mini Map
        this.rendererMinimap = PIXI.autoDetectRenderer(400, 400,{backgroundColor : 0x000000});
        this.rendererMinimap.baseResolution = {width: this.rendererMinimap.width, height: this.rendererMinimap.height};
        $('#minimap').append(this.rendererMinimap.view);

        // Data
        this.data = {};
        this.data.config = {};
        this.data.config.health = {};
        this.data.config.health.style = 'circle';
        this.data.config.health.alpha = 0.5;
        this.data.config.health.color = 'player';
        this.data.config.background = {};
        this.data.config.background.style = 'colorfog';
        this.data.config.background.color = 'dark';
        this.data.map = [];
        this.data.players = {tick: [], list: [], minimap: []};
        this.data.oldPlayers = {tick: [], list: [], minimap: []};// one tick behind for smoothing the frames
        this.data.lasers = [];
        this.data.myId = 0;
        this.data.serverTick = 1000;// miliseconds per server tick, replaced by actual server tick rate
        this.data.minimapTick = 1000;// miliseconds per server tick, replaced by actual server tick rate

        // Render Layers
        this.render = {};
        this.render.world = new PIXI.Container();
        this.render.camera = new PIXI.Container();
        this.render.text = new PIXI.Container();
        this.render.map = new PIXI.Graphics();
        this.render.players = new PIXI.Graphics();
        this.render.lasers = new PIXI.Graphics();

        // Minimap layers
        this.render.miniworld = new PIXI.Container();
        this.render.minimap = new PIXI.Graphics();
        this.render.miniplayers = new PIXI.Graphics();

        // Background for the map layer
        this.render.backgroundImageDark = PIXI.Texture.fromImage('images/colorfog.jpg');
        this.render.backgroundImageLight = PIXI.Texture.fromImage('images/colorfoglight.jpg');
        this.render.background = new PIXI.extras.TilingSprite(this.render.backgroundImageDark, 1000, 1000);

        // Player names
        this.render.names = [];

        // Building the parent child tree
        this.render.world.addChild(this.render.camera);
        this.render.camera.addChild(this.render.background);
        this.render.camera.addChild(this.render.map);
        this.render.camera.addChild(this.render.players);
        this.render.camera.addChild(this.render.lasers);
        this.render.camera.addChild(this.render.text);

        // Minimap tree
        this.render.miniworld.addChild(this.render.minimap);
        this.render.miniworld.addChild(this.render.miniplayers);

        // Draw functions
        this.draw = {};
        this.draw.map = ()=>{
            var blocksize = this.data.config.blocksize;
            var mapPixels = blocksize * this.data.map.length;
            var mapLength = this.data.map.length;

            this.render.background.width = mapPixels;
            this.render.background.height = mapPixels;

            this.render.map.clear();

            var mapColor = {};
            if(this.data.config.background.color == 'light'){
                this.render.background.texture = this.render.backgroundImageLight;
                this.renderer.backgroundColor = 0xffffff;
                mapColor.outline = '0x999999';
                mapColor.mainGridLine = '0xCCCCCC';
                mapColor.sideGridLine = '0xDDDDDD';
                mapColor.colorGrid = '0xEEEEEE';
            }else{
                this.render.background.texture = this.render.backgroundImageDark;
                this.renderer.backgroundColor = 0x000000;
                mapColor.outline = '0xffffff';
                mapColor.mainGridLine = '0x333333';
                mapColor.sideGridLine = '0x222222';
                mapColor.colorGrid = '0x111111';
            }



            if(this.data.config.background.style == 'grid'){
                this.render.map.beginFill(mapColor.colorGrid);
                this.render.map.lineStyle(0, 0xffffff, 1);
                this.render.map.drawRect(0,0, mapPixels, mapPixels);
                this.render.map.endFill();



                for(let i=0; i<mapLength; i++){
                    this.render.map.lineStyle(4, mapColor.mainGridLine, 1);
                    this.render.map.moveTo(i * blocksize, 0);
                    this.render.map.lineTo(i * blocksize, mapPixels);

                    this.render.map.lineStyle(4, mapColor.sideGridLine, 1);
                    this.render.map.moveTo(i * blocksize + Math.floor(blocksize * 0.33), 0);
                    this.render.map.lineTo(i * blocksize + Math.floor(blocksize * 0.33), mapPixels);

                    this.render.map.moveTo(i * blocksize + Math.floor(blocksize * 0.66), 0);
                    this.render.map.lineTo(i * blocksize + Math.floor(blocksize * 0.66), mapPixels);
                }
                for(let k=0; k<mapLength; k++){
                    this.render.map.lineStyle(4, mapColor.mainGridLine, 1);
                    this.render.map.moveTo(0, k * blocksize);
                    this.render.map.lineTo(mapPixels, k * blocksize);

                    this.render.map.lineStyle(4, mapColor.sideGridLine, 1);
                    this.render.map.moveTo(0, k * blocksize + Math.floor(blocksize * 0.33));
                    this.render.map.lineTo(mapPixels, k * blocksize + Math.floor(blocksize * 0.33));

                    this.render.map.moveTo(0, k * blocksize + Math.floor(blocksize * 0.66));
                    this.render.map.lineTo(mapPixels, k * blocksize + Math.floor(blocksize * 0.66));
                }
            }

            this.data.map.forEach((element, index)=>{

                element.forEach((e, i)=>{
                    if(e != 0){
                        var offset = {x: i * blocksize, y: index * blocksize};
                        var border = 6;
                        this.render.map.lineStyle(0, 0xffffff, 1);

                        this.render.map.beginFill(mapColor.outline);
                        this.render.map.drawRect(offset.x, offset.y, blocksize, blocksize);
                        this.render.map.endFill();

                        this.render.map.beginFill(this.color.numToColor(e));
                        this.render.map.drawRect(offset.x + border, offset.y + border, blocksize - border*2, blocksize - border*2);
                        this.render.map.endFill();


                        // Draw stuff on bonus blocks
                        this.render.map.lineStyle(20, 0x999999, 1);
                        if(e==21){// health

                            this.render.map.moveTo(offset.x + blocksize/2, offset.y + blocksize*0.25);
                            this.render.map.lineTo(offset.x + blocksize/2, offset.y + blocksize*0.75);
                            this.render.map.moveTo(offset.x + blocksize*0.25, offset.y + blocksize/2);
                            this.render.map.lineTo(offset.x + blocksize*0.75, offset.y + blocksize/2);
                        }else if(e==22){// warp
                            this.render.map.drawCircle(offset.x + blocksize/2, offset.y + blocksize/2, blocksize/3);
                            this.render.map.drawCircle(offset.x + blocksize/2, offset.y + blocksize/2, blocksize/5);
                        }else if(e==23){// thrust
                            this.render.map.moveTo(offset.x + blocksize*0.15, offset.y + blocksize*0.70);
                            this.render.map.bezierCurveTo(
                                offset.x + blocksize*0.3, offset.y + blocksize*0.3,
                                offset.x + blocksize*0.7, offset.y + blocksize*0.7,
                                offset.x + blocksize*0.85, offset.y + blocksize*0.30
                            );
                        }else if(e==24){// weapon
                            this.render.map.moveTo(offset.x + blocksize*0.15, offset.y + blocksize*0.60);
                            this.render.map.lineTo(offset.x + blocksize*0.65, offset.y + blocksize*0.60);
                            this.render.map.moveTo(offset.x + blocksize*0.35, offset.y + blocksize*0.40);
                            this.render.map.lineTo(offset.x + blocksize*0.85, offset.y + blocksize*0.40);
                        }
                    }

                });
            });
        };
        this.draw.minimap = ()=>{
            var blocksize = this.rendererMinimap.baseResolution.width / this.data.map.length;

            this.render.minimap.clear();

            this.data.map.forEach((element, index)=>{
                element.forEach((e, i)=>{
                    if(e > 20 && e < 30){
                        let offset = {x: i * blocksize, y: index * blocksize};

                        this.render.minimap.beginFill('0x337733');
                        this.render.minimap.alpha = 1;
                        this.render.minimap.lineStyle(0, 0xffffff, 1);
                        this.render.minimap.drawRect(offset.x, offset.y, blocksize, blocksize);
                        this.render.minimap.endFill();
                    }else if(e != 0){
                        let offset = {x: i * blocksize, y: index * blocksize};

                        this.render.minimap.beginFill('0x333333');
                        this.render.minimap.alpha = 1;
                        this.render.minimap.lineStyle(0, 0xffffff, 1);
                        this.render.minimap.drawRect(offset.x, offset.y, blocksize, blocksize);
                        this.render.minimap.endFill();
                    }

                });
            });

        };
        this.draw.players = ()=>{
            var ship = {width: 40, height: 60};
            var shipX = {point: (ship.height / 3) * 2, left: -(ship.height / 3), right: -(ship.height / 3)};
            var shipY = {point: 0, left: -(ship.width / 2), right: (ship.width / 2)};

            this.render.players.clear();
            this.render.names.forEach((e,i)=>{
                this.render.names[i].text = '';
            });

            this.data.players.tick.forEach((e,i)=>{
                if(e[4] == 0) return false;// skip dead players

                var offset = {x: e[1], y: e[2], r: e[3]/1000};
                var id = e[0];
                var player = this.data.players.list['p' + id];
                var drawDate = Date.now();
                //id x y rotation health level

                // check for old data to smooth with
                this.data.oldPlayers.tick.forEach((ele, ind)=>{
                    if(e[0] == ele[0]){// same player
                        offset = {
                            x: Math.floor(Lib.betweenTwoNum(ele[1], e[1], (drawDate - e[e.length - 1]) / this.data.serverTick)),
                            y: Math.floor(Lib.betweenTwoNum(ele[2], e[2], (drawDate - e[e.length - 1]) / this.data.serverTick)),
                            r: offset.r // no smooting on direction for now
                        };
                    }
                });

                // Add more text objets if needed
                if(typeof this.render.names[i] == 'undefined'){
                    this.render.names[i] = new PIXI.Text('', {font: 'bold 30px Arial', fill: 'white', align: 'center', stroke: '#000000', strokeThickness: 6 });
                    this.render.names[i].anchor.set(0.5);
                    this.render.text.addChild(this.render.names[i]);
                }

                // Name
                this.render.names[i].text = player.name;
                this.render.names[i].position.x = offset.x;
                this.render.names[i].position.y = offset.y - 100;


                // Color scheme
                var healthColor = {};
                if(this.data.config.health.color == 'default'){
                    healthColor.full = '0x00ff00';
                    healthColor.empty = '0xff0000';
                    healthColor.outline = '0x000000';
                }else if(this.data.config.health.color == 'class'){
                    console.log(player.type);
                    if(player.type == 0){
                        healthColor.full = '0xff0000';
                        healthColor.empty = '0x333333';
                        healthColor.outline = '0x000000';
                    }else if(player.type == 1){
                        healthColor.full = '0x00ff00';
                        healthColor.empty = '0x333333';
                        healthColor.outline = '0x000000';
                    }else{
                        healthColor.full = '0x0000ff';
                        healthColor.empty = '0x333333';
                        healthColor.outline = '0x000000';
                    }

                }else{// player
                    healthColor.full = this.color.numToColor(player.color);
                    healthColor.empty = '0x333333';
                    healthColor.outline = '0x000000';
                }


                // Draw Bar
                if(this.data.config.health.style == 'bar'){
                    // Health bar
                    var healthWidthMult = 2;// streach health bar
                    this.render.players.beginFill(healthColor.empty, this.data.config.health.alpha);
                    this.render.players.lineStyle(3, healthColor.outline, this.data.config.health.alpha);
                    this.render.players.drawRect(offset.x - 50 * healthWidthMult, offset.y - 80, 100 * healthWidthMult, 12);
                    this.render.players.endFill();

                    this.render.players.beginFill(healthColor.full, this.data.config.health.alpha);
                    this.render.players.lineStyle(3, healthColor.outline, this.data.config.health.alpha);
                    this.render.players.drawRect(offset.x - 50 * healthWidthMult, offset.y - 80, e[4] * healthWidthMult, 12);
                    this.render.players.endFill();
                } else {// Draw Circle
                    // black border
                    this.render.players.lineStyle(12, healthColor.outline, this.data.config.health.alpha);
                    this.render.players.drawCircle(offset.x, offset.y, 80);

                    // Green
                    this.render.players.lineStyle(10, healthColor.full, this.data.config.health.alpha);
                    this.render.players.moveTo(offset.x + 80, offset.y);
                    this.render.players.arc(offset.x, offset.y, 80, 0, (Math.PI * 2) * (e[4]/100), false);

                    // Red
                    this.render.players.lineStyle(10, healthColor.empty, this.data.config.health.alpha);
                    this.render.players.moveTo(offset.x + 80, offset.y);
                    this.render.players.arc(offset.x, offset.y, 80, 0, (Math.PI * 2) * (e[4]/100), true);
                }






                // Player ship
                this.render.players.beginFill(this.color.numToColor(player.color));
                this.render.players.lineStyle(6, 0xffffff, 1);
                this.render.players.moveTo(offset.x + (shipX.point * Math.cos(offset.r) - shipY.point * Math.sin(offset.r)), offset.y  + (shipX.point * Math.sin(offset.r) + shipY.point * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipX.left * Math.cos(offset.r) - shipY.left * Math.sin(offset.r)), offset.y  + (shipX.left * Math.sin(offset.r) + shipY.left * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipX.right * Math.cos(offset.r) - shipY.right * Math.sin(offset.r)), offset.y  + (shipX.right * Math.sin(offset.r) + shipY.right * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipX.point * Math.cos(offset.r) - shipY.point * Math.sin(offset.r)), offset.y  + (shipX.point * Math.sin(offset.r) + shipY.point * Math.cos(offset.r)));
                this.render.players.endFill();



                // Move camera if player is you
                if(e[0] == this.data.myId){
                    this.render.camera.position.x = -offset.x + Game.view.x / 2;
                    this.render.camera.position.y = -offset.y + Game.view.y / 2;
                }
            });
        };
        this.draw.miniplayers = ()=>{
            var blocksize = this.rendererMinimap.baseResolution.width / this.data.map.length;
            var scale = blocksize / this.data.config.blocksize;

            this.render.miniplayers.clear();
            var player = this.data.players.list['p' + this.data.myId];
            var drawDate = Date.now();

            // Draw Other players
            this.data.players.minimap.forEach((e,i)=>{

                let offset = {x: e[0] * scale, y: e[1] * scale};

                // check for old data to smooth with
                this.data.oldPlayers.minimap.forEach((ele, ind)=>{
                    if(e[2] == ele[2]){// same player
                        offset = {
                            x: Math.floor(Lib.betweenTwoNum(ele[0], e[0], (drawDate - e[e.length - 1]) / this.data.minimapTick) * scale),
                            y: Math.floor(Lib.betweenTwoNum(ele[1], e[1], (drawDate - e[e.length - 1]) / this.data.minimapTick) * scale)
                        };

                    }
                });

                if(e[2] == this.data.myId){
                    // Draw your player
                    this.render.miniplayers.beginFill(this.color.numToColor(player.color));
                    this.render.miniplayers.lineStyle(4, 0xffffff, 1);
                    this.render.miniplayers.moveTo(offset.x, offset.y - 13.2);
                    this.render.miniplayers.lineTo(offset.x + 10, offset.y + 6.6);
                    this.render.miniplayers.lineTo(offset.x - 10, offset.y + 6.6);
                    this.render.miniplayers.lineTo(offset.x, offset.y - 13.2);
                    this.render.miniplayers.endFill();
                }else{
                    // Other players
                    this.render.miniplayers.beginFill(this.color.numToColor(player.color));
                    this.render.miniplayers.lineStyle(4, 0xffffff, 1);
                    this.render.miniplayers.drawCircle(offset.x, offset.y, 10);
                    this.render.miniplayers.endFill();
                }


            });



        };
        this.draw.lasers = ()=>{
            var frameTime = Date.now();
            var laserTimeout = 100;

            this.render.lasers.clear();

            // remove old lasers
            for(var i=0; i<this.data.lasers.length; i++){
                var age = frameTime - this.data.lasers[i][5];

                if(age > laserTimeout){
                    this.data.lasers.splice(i,1);
                    i--;
                }
            }

            this.data.lasers.forEach((e,i)=>{
                var offset = {x1: e[0], y1: e[1], x2: e[2], y2: e[3]};
                var owner = e[4];
                var age = frameTime - e[e.length -1];

                //this.render.lasers.beginFill('0xff0000');
                //this.render.lasers.alpha = (1 - age/laserTimeout) * 0.9;
                this.render.lasers.lineStyle((1 - age/laserTimeout) * 10, 0xffffff, 1);
                this.render.lasers.moveTo(offset.x1 , offset.y1);
                this.render.lasers.lineTo(offset.x2, offset.y2);
                //this.render.lasers.lineTo(offset.x1, offset.y1);
                //this.render.lasers.endFill();
            });

        };

        // Color funcitons
        this.color = {};
        this.color.componentToHex = (c)=>{
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        };
        this.color.rgbToHex = (r, g, b)=>{
            return "0x" + this.color.componentToHex(r) + this.color.componentToHex(g) + this.color.componentToHex(b);
        };
        this.color.numToColor = (num)=>{
            var colors = ['0xffffff','0x800080','0x0000ff','0x00ff00','0xffff00','0xeb9447','0xff0000'];

            if(typeof colors[num] !== 'undefined')
                return colors[num];
            else{
                return colors[0];
            }
        };
        this.color.randHex = ()=>{
            return this.color.rgbToHex(Math.floor(Math.random()*256), Math.floor(Math.random()*256), Math.floor(Math.random()*256));
        };


        // Screen resizing
        // Make the game window responsive
        $(window).on('resize', ()=>{

            // Minimap render window
            var minimapWidth = $('#minimap').width();
            var minimapHeight = $('#minimap').height();
            this.rendererMinimap.resize(minimapWidth, minimapHeight);

            this.render.miniworld.scale.x = minimapWidth / this.rendererMinimap.baseResolution.width;
            this.render.miniworld.scale.y =	minimapHeight / this.rendererMinimap.baseResolution.height;


            // Main render window
            var width = $(window).width();
            var height = $(window).height();

            this.center = {x: width / 2, y: height / 2};
            this.renderer.resize(width, height);

            var scale = {};
            scale.w = width / this.renderer.baseResolution.width;
            scale.h = height / this.renderer.baseResolution.height;
            scale.largest = scale.w;
            scale.smallest = scale.h;
            scale.orentation = 'landscape';
            if(scale.h > scale.w){
                scale.largest = scale.h;
                scale.smallest = scale.w;
                scale.orentation = 'portrait';
            }
            scale.difference = scale.largest - scale.smallest;

            this.render.world.scale.x = scale.largest;
            this.render.world.scale.y =	scale.largest;
            this.render.world.position.x = 0;
            this.render.world.position.y = 0;
            if(scale.orentation == 'portrait')
                this.render.world.position.x -= (this.renderer.baseResolution.width * scale.difference) / 2;
            else
                this.render.world.position.y -= (this.renderer.baseResolution.height * scale.difference) / 2;
        });
        this.zoom(this.zoomLevel);// default zoom
        //$(window).trigger('resize');// trigger

        this.animate();
    }

    zoom(x){
        if(x == 1){
            this.renderer.baseResolution.width = 1500;
            this.renderer.baseResolution.height = 750;
            this.view.x = 1500;
            this.view.y = 750;
        }else if(x == 2){
            this.renderer.baseResolution.width = 2000;
            this.renderer.baseResolution.height = 1000;
            this.view.x = 2000;
            this.view.y = 1000;
        }else if(x == 3){
            this.renderer.baseResolution.width = 2500;
            this.renderer.baseResolution.height = 1250;
            this.view.x = 2500;
            this.view.y = 1250;
        }else {
            this.renderer.baseResolution.width = 3000;
            this.renderer.baseResolution.height = 1500;
            this.view.x = 3000;
            this.view.y = 1500;
        }
        this.zoomLevel = x;
        $(window).trigger('resize');
    }

    executeMessage(msg){
        var parts = msg.split(' ');
        if(parts.length == 0) return false;

        if(parts[0] == '//'){
            if(parts[1] == 'health'){
                if(parts[2] == 'style'){
                    if(parts[3] == 'bar')
                        this.data.config.health.style = 'bar';
                    else
                        this.data.config.health.style = 'circle';

                }else if(parts[2] == 'alpha'){
                    let num = parseFloat(parts[3]);
                    if(!isNaN(num))
                        this.data.config.health.alpha = num;

                }else if(parts[2] == 'color'){
                    if(parts[3] == 'default')
                        this.data.config.health.color = 'default';
                    else if(parts[3] == 'class')
                        this.data.config.health.color = 'class';
                    else
                        this.data.config.health.color = 'player';

                }
            }else if(parts[1] == 'background'){
                if(parts[2] == 'style'){
                    if(parts[3] == 'grid')
                        this.data.config.background.style = 'grid';
                    else
                        this.data.config.background.style = 'colorfog';

                    this.draw.map();
                }else if(parts[2] == 'color'){
                    if(parts[3] == 'light')
                        this.data.config.background.color = 'light';
                    else
                        this.data.config.background.color = 'dark';

                    this.draw.map();
                }

            }else if(parts[1] == 'zoom'){
                let num = parseInt(parts[2]);
                if(!isNaN(num))
                    this.zoom(num);

            }else if(parts[1] == 'id'){
                Game.chatMessage("Your ID is: " + this.data.myId, 'game');
            }else if(parts[1] == 'ping'){
                WS.sendObj({m: 'ping', v: Date.now()});
            }

            return true;
        }


        return false;
    }

    chatMessage(msg, type){
        $('#chat-log').prepend(
            $('<div />')
                .addClass(type)
                .text(msg)
        );
    }

    animate(){
        requestAnimationFrame(()=>{this.animate()});
        this.draw.lasers();
        this.draw.players();
        this.draw.miniplayers();
        this.renderer.render(this.render.world);
        this.rendererMinimap.render(this.render.miniworld);
    }
}
var Game = new GameClass();