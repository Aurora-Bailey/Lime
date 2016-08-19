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
                    Game.data.config.blocksize = d.block;
                    Game.draw.map();
                    PO.ready = true;
                    $('#homepage').addClass('hide');
                    $('#maingame').removeClass('hide');
                    var playerId = d.id;
                }else if(d.m == "ping"){
                    console.log(Date.now() - parseInt(d.v));
                }
            }else{
                var x = new Int8Array(d);

                if(x[0] == 7){
                    var playerData = new Int16Array(d);
                    var players = [];
                    var singlePlayer = [];
                    for(var i=2; i<playerData.length; i++){
                        singlePlayer.push(playerData[i]);
                        if(singlePlayer.length == playerData[1]){
                            players.push(singlePlayer);
                            singlePlayer = [];
                        }
                    }
                    Game.data.players.tick = players;
                    Game.draw.players();
                }

            }


        };
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
        this.chatText = '';

        // click state
        this.thrusterState = false;
        this.weaponState = false;
        this.thrust = function(on){
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
        this.weapon = function(on){
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
        this.view = {x: 3000, y: 1500};
        this.renderer = PIXI.autoDetectRenderer(this.view.x, this.view.y,{backgroundColor : 0x000000});
        this.renderer.baseResolution = {width: this.renderer.width, height: this.renderer.height};
        $('#maingame').append(this.renderer.view);

        // Data
        this.data = {};
        this.data.config = {};
        this.data.map = [];
        this.data.players = {tick: [], list: []};
        this.data.myId = 0;

        // Render Layers
        this.render = {};
        this.render.world = new PIXI.Container();
        this.render.camera = new PIXI.Container();
        this.render.map = new PIXI.Graphics();
        this.render.players = new PIXI.Graphics();

        // Background for the map layer
        this.render.backgroundImage = PIXI.Texture.fromImage('images/colorfog.jpg');
        this.render.background = new PIXI.extras.TilingSprite(this.render.backgroundImage, 1000, 1000);

        // Building the parent child tree
        this.render.world.addChild(this.render.camera);
        this.render.camera.addChild(this.render.background);
        this.render.camera.addChild(this.render.map);
        this.render.camera.addChild(this.render.players);

        // Draw functions
        this.draw = {};
        this.draw.map = ()=>{
            var blocksize = this.data.config.blocksize;

            this.render.background._width = blocksize * this.data.map.length;
            this.render.background._height = blocksize * this.data.map.length;

            this.render.map.clear();

            this.data.map.forEach((element, index)=>{
                element.forEach((e, i)=>{
                    if(e != 0){
                        var offset = {x: i * blocksize, y: index * blocksize};
                        var border = 6;

                        this.render.map.beginFill('0xffffff');
                        this.render.map.alpha = 1;
                        this.render.map.lineStyle(0, 0xffffff, 1);
                        this.render.map.moveTo(offset.x + 0, offset.y + 0);
                        this.render.map.lineTo(offset.x + 0, offset.y + blocksize);
                        this.render.map.lineTo(offset.x + blocksize, offset.y + blocksize);
                        this.render.map.lineTo(offset.x + blocksize, offset.y + 0);
                        this.render.map.lineTo(offset.x + 0, offset.y + 0);
                        this.render.map.endFill();

                        this.render.map.beginFill(this.color.numToColor(e));
                        this.render.map.alpha = 1;
                        this.render.map.lineStyle(0, 0xffffff, 1);
                        this.render.map.moveTo(offset.x + border, offset.y + border);
                        this.render.map.lineTo(offset.x + border, offset.y + blocksize - border);
                        this.render.map.lineTo(offset.x + blocksize - border, offset.y + blocksize -border);
                        this.render.map.lineTo(offset.x + blocksize - border, offset.y + border);
                        this.render.map.lineTo(offset.x + border, offset.y + border);
                        this.render.map.endFill();
                    }

                });
            });

        };
        this.draw.players = ()=>{
            var ship = {width: 40, height: 60};
            var shipX = {point: (ship.height / 3) * 2, left: -(ship.height / 3), right: -(ship.height / 3)};
            var shipY = {point: 0, left: -(ship.width / 2), right: (ship.width / 2)};

            /*
            var border = 8;
            var shipInside = {width: ship.width - (border*2), height: ship.height - (border*2)};
            var shipXInside = {point: (shipInside.height / 3) * 2, left: -(shipInside.height / 3), right: -(shipInside.height / 3)};
            var shipYInside = {point: 0, left: -(shipInside.width / 2), right: (shipInside.width / 2)};
            */

            this.render.players.clear();

            this.data.players.tick.forEach((e,i)=>{
                var offset = {x: e[1], y: e[2], r: e[3]/1000};


                this.render.players.beginFill('0xff0000');
                this.render.players.alpha = 1;
                this.render.players.lineStyle(6, 0xffffff, 1);
                this.render.players.moveTo(offset.x + (shipX.point * Math.cos(offset.r) - shipY.point * Math.sin(offset.r)), offset.y  + (shipX.point * Math.sin(offset.r) + shipY.point * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipX.left * Math.cos(offset.r) - shipY.left * Math.sin(offset.r)), offset.y  + (shipX.left * Math.sin(offset.r) + shipY.left * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipX.right * Math.cos(offset.r) - shipY.right * Math.sin(offset.r)), offset.y  + (shipX.right * Math.sin(offset.r) + shipY.right * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipX.point * Math.cos(offset.r) - shipY.point * Math.sin(offset.r)), offset.y  + (shipX.point * Math.sin(offset.r) + shipY.point * Math.cos(offset.r)));
                this.render.players.endFill();

                /*
                this.render.players.beginFill('0xff0000');
                this.render.players.alpha = 1;
                this.render.players.lineStyle(0, 0xffffff, 1);
                this.render.players.moveTo(offset.x + (shipXInside.point * Math.cos(offset.r) - shipYInside.point * Math.sin(offset.r)), offset.y  + (shipXInside.point * Math.sin(offset.r) + shipYInside.point * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipXInside.left * Math.cos(offset.r) - shipYInside.left * Math.sin(offset.r)), offset.y  + (shipXInside.left * Math.sin(offset.r) + shipYInside.left * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipXInside.right * Math.cos(offset.r) - shipYInside.right * Math.sin(offset.r)), offset.y  + (shipXInside.right * Math.sin(offset.r) + shipYInside.right * Math.cos(offset.r)));
                this.render.players.lineTo(offset.x + (shipXInside.point * Math.cos(offset.r) - shipYInside.point * Math.sin(offset.r)), offset.y  + (shipXInside.point * Math.sin(offset.r) + shipYInside.point * Math.cos(offset.r)));
                this.render.players.endFill();
                */

                // Move camera if player is you
                if(e[0] == this.data.myId){
                    this.render.camera.position.x = -offset.x + Game.view.x / 2;
                    this.render.camera.position.y = -offset.y + Game.view.y / 2;
                }
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
            var colors = ['0xffffff','0x800080','0x0000ff','0x00ff00','0xffff00','0xe67e22','0xff0000'];

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
        $(window).trigger('resize');// trigger

        this.animate();
    }

    animate(){
        requestAnimationFrame(()=>{this.animate()});
        this.renderer.render(this.render.world);
    }
}
var Game = new GameClass();



/*
var center = {x: $(window).width() / 2, y: $(window).height() / 2};
var renderer = PIXI.autoDetectRenderer(3000, 1500,{backgroundColor : 0x000000});
renderer.baseResolution = {width: renderer.width, height: renderer.height};
$('#maingame').append(renderer.view);

// create the root of the scene graph
var world = new PIXI.Container();
var map = new PIXI.Container();
var map_size = 80;
var map_block = 200;
var player = new PIXI.Container();
world.addChild(map);
world.addChild(player);


// Images
var texture = PIXI.Texture.fromImage('images/colorfog.jpg');
var tilingSprite = new PIXI.extras.TilingSprite(texture, map_block * map_size, map_block * map_size);
map.addChild(tilingSprite);

//tilingSprite._width = 800;



// create a new Sprite using the texture
var ship = new PIXI.Graphics();
ship.Q = {};
ship.Q.Width = 40;
ship.Q.Height = 60;
ship.Q.VelocityX = 0;
ship.Q.VelocityY = 0;
ship.Q.Direction = 0;
ship.Q.Thrusters = {m: false, l: false, r: false, color: 0x00ffff};
ship.Q.Speed = 0;
ship.Q.drawCount = 0;

ship.draw = function(){
    ship.Q.drawCount ++;

    ship.clear();
    if(ship.Q.Thrusters.r){
        ship.beginFill(ship.Q.Thrusters.color);
        ship.lineStyle(0, 0xffd900, 1);
        ship.drawCircle(ship.Q.Height/6, 0, ship.Q.Width / (Math.sin(ship.Q.drawCount) / 3 + 4));
        ship.endFill();
    }
    if(ship.Q.Thrusters.l){
        ship.beginFill(ship.Q.Thrusters.color);
        ship.lineStyle(0, 0xffd900, 1);
        ship.drawCircle(ship.Q.Height/6, ship.Q.Width, ship.Q.Width / (Math.sin(ship.Q.drawCount) / 3 + 4));
        ship.endFill();
    }
    if(ship.Q.Thrusters.m){
        ship.beginFill(ship.Q.Thrusters.color);
        ship.lineStyle(0, 0xffd900, 1);
        ship.drawCircle(0, ship.Q.Width / 2, ship.Q.Width / (Math.sin(ship.Q.drawCount) / 3 + 3));
        ship.endFill();
    }

    // set a fill and line style
    ship.beginFill(0xff00ff);
    ship.lineStyle(6, 0x00ffff, 1);
    ship.moveTo(0, 0);
    ship.lineTo(ship.Q.Height, ship.Q.Width/2);
    ship.lineTo(0, ship.Q.Width);
    ship.lineTo(0, 0);
    ship.endFill();
};

// center the sprite's anchor point
ship.pivot.x = ship.Q.Width / 2;
ship.pivot.y = ship.Q.Height * (1/3);

ship.position.x = renderer.baseResolution.width / 2;
ship.position.y = renderer.baseResolution.height / 2;

player.addChild(ship);



var map_array = [];
for(var k=0; k< map_size; k++){
    map_array[k] = [];
    for(var m=0; m< map_size; m++){
        map_array[k][m] = Math.round(Math.random());
    }
}


//repeat a few times
for(var p=0; p<10; p++){
    // remove blocks with few neighbors
    for(k=0; k< map_size; k++){
        for(m=0; m< map_size; m++){
            if(map_array[k][m]){
                var n = 0;
                if(typeof map_array[k+1] !== "undefined" && map_array[k+1][m]){
                    n++;
                }
                if(typeof map_array[k-1] !== "undefined" && map_array[k-1][m]){
                    n++;
                }

                if(typeof map_array[k][m+1] !== "undefined" && map_array[k][m+1]){
                    n++;
                }
                if(typeof map_array[k][m-1] !== "undefined" && map_array[k][m-1]){
                    n++;
                }

                if(n < 2){
                    map_array[k][m] = 2;// 2 == delete later
                }
            }

        }
    }

    for(k=0; k< map_size; k++){
        for(m=0; m< map_size; m++){
            if(map_array[k][m] == 2){
                map_array[k][m] = 0;
            }

        }
    }
}


// Build wall
for(k=0; k< map_size; k++){
    for(m=0; m< map_size; m++){
        //build walls
        if(k == 0 || k == map_size -1 || m == 0 || m == map_size -1){
            map_array[k][m] = 1;
        }
    }
}


for(var i=0; i< map_array.length; i++){
    // create a new Sprite using the texture
    var block = new PIXI.Graphics();
    block.Q = {};
    block.Q.Width = map_block;
    block.Q.Height = map_block;
    for(var j=0; j< map_array[i].length; j++){

        var offset = j * block.Q.Width;

        if(map_array[i][j]){
            // set a fill and line style
            block.beginFill(randHex());
            block.alpha = 0.3;
            block.lineStyle(6, 0xffffff, 1);
            block.moveTo(offset + 0, 0);
            block.lineTo(offset + 0, block.Q.Width);
            block.lineTo(offset + block.Q.Height, block.Q.Width);
            block.lineTo(offset + block.Q.Height, 0);
            block.lineTo(offset + 0, 0);
            block.endFill();
        }


    }
    block.position.x = 0;
    block.position.y = i * block.Q.Width;

    map.addChild(block);
}

// Make the game window responsive
window.onresize = function(){
    var width = $(window).width();
    var height = $(window).height();

    center = {x: width / 2, y: height / 2};
    renderer.resize(width, height);

    var scale = {};
    scale.w = width / renderer.baseResolution.width;
    scale.h = height / renderer.baseResolution.height;
    scale.largest = scale.w;
    scale.smallest = scale.h;
    scale.orentation = 'landscape';
    if(scale.h > scale.w){
        scale.largest = scale.h;
        scale.smallest = scale.w;
        scale.orentation = 'portrait';
    }
    scale.difference = scale.largest - scale.smallest;

    world.scale.x = scale.largest;
    world.scale.y =	scale.largest;
    world.position.x = 0;
    world.position.y = 0;
    if(scale.orentation == 'portrait')
        world.position.x -= (renderer.baseResolution.width * scale.difference) / 2;
    else
        world.position.y -= (renderer.baseResolution.height * scale.difference) / 2;
};
window.onresize();// trigger

// start animating
animate();
function animate() {
    requestAnimationFrame(animate);

    ship.draw();

    if(ship.Q.Thrusters.m == true){
        ship.Q.VelocityX += Math.cos(ship.Q.Direction) * 0.8;
        ship.Q.VelocityY += Math.sin(ship.Q.Direction) * 0.8;
    }

    ship.Q.VelocityX *= 0.99;
    ship.Q.VelocityY *= 0.99;

    ship.Q.Speed = Math.floor(Math.sqrt(Math.pow(Math.abs(ship.Q.VelocityY), 2) + Math.pow(Math.abs(ship.Q.VelocityX), 2)));

    map.position.x -= ship.Q.VelocityX;
    map.position.y -= ship.Q.VelocityY;

    // render the container
    renderer.render(world);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
    return "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function randHex(){
    return rgbToHex(Math.floor(Math.random()*256) + 0, Math.floor(Math.random()*256) + 0, Math.floor(Math.random()*256) + 0);
}
*/