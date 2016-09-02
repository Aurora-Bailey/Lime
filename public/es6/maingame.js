class GameClass{
    constructor(){


        // Core
        this.center = {x: $(window).width() / 2, y: $(window).height() / 2};
        this.view = {x: 2000, y: 1000};// will be overwritten by game.zoom
        this.zoomLevel = 3;
        this.renderer = PIXI.autoDetectRenderer(this.view.x, this.view.y,{backgroundColor : '0x000000'});
        this.renderer.baseResolution = {width: this.renderer.width, height: this.renderer.height};
        $('#maingame').append(this.renderer.view);

        // Mini Map
        this.rendererMinimap = PIXI.autoDetectRenderer(400, 400,{backgroundColor : '0x000000'});
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
        this.data.config.background.style = 'grid';
        this.data.config.background.color = 'dark';
        this.data.map = [];
        this.data.players = {tick: [], list: [], minimap: [], rank: []};
        this.data.oldPlayers = {tick: [], list: [], minimap: [], rank: []};// one tick behind for smoothing the frames
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
                this.renderer.backgroundColor = '0xffffff';
                mapColor.outline = '0x999999';
                mapColor.mainGridLine = '0xCCCCCC';
                mapColor.sideGridLine = '0xDDDDDD';
                mapColor.colorGrid = '0xEEEEEE';
            }else{
                this.render.background.texture = this.render.backgroundImageDark;
                this.renderer.backgroundColor = '0x000000';
                mapColor.outline = '0xffffff';
                mapColor.mainGridLine = '0x333333';
                mapColor.sideGridLine = '0x222222';
                mapColor.colorGrid = '0x111111';
            }



            if(this.data.config.background.style == 'grid'){
                this.render.map.beginFill(mapColor.colorGrid);
                this.render.map.lineStyle(0, '0xffffff', 1);
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
                        this.render.map.lineStyle(0, '0xffffff', 1);

                        this.render.map.beginFill(mapColor.outline);
                        this.render.map.drawRect(offset.x, offset.y, blocksize, blocksize);
                        this.render.map.endFill();

                        this.render.map.beginFill(this.color.numToColor(e));
                        this.render.map.drawRect(offset.x + border, offset.y + border, blocksize - border*2, blocksize - border*2);
                        this.render.map.endFill();


                        // Draw stuff on bonus blocks
                        this.render.map.lineStyle(20, '0x999999', 1);
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
                        this.render.minimap.lineStyle(0, '0xffffff', 1);
                        this.render.minimap.drawRect(offset.x, offset.y, blocksize, blocksize);
                        this.render.minimap.endFill();
                    }else if(e != 0){
                        let offset = {x: i * blocksize, y: index * blocksize};

                        this.render.minimap.beginFill('0x333333');
                        this.render.minimap.alpha = 1;
                        this.render.minimap.lineStyle(0, '0xffffff', 1);
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

            var icons = {};
            icons.shield = $('<div />').html('&#xf132;').text();
            icons.plus = $('<div />').html('&#xf067;').text();
            icons.power = $('<div />').html('&#xf0e7;').text();

            this.render.players.clear();
            this.render.names.forEach((e,i)=>{
                this.render.names[i].position.x = -10000;
            });

            this.data.players.tick.forEach((e,i)=>{
                if(e[4] == 0) return false;// skip dead players

                var offset = {x: e[1], y: e[2], r: e[3]/1000};
                var id = e[0];
                var player = this.data.players.list['p' + id];
                if(typeof player == 'undefined') return false;
                var levelColor = '0x000000';
                if(typeof player.levelColor != 'undefined') levelColor = player.levelColor;
                var healthPercent = Math.floor(e[4]/10);// from 1000 to 100 for drawing
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
                if(typeof this.render.names[id] == 'undefined'){
                    this.render.names[id] = new PIXI.Text('', {font: 'bold 30px Arial', fill: 'white', align: 'center', stroke: '#000000', strokeThickness: 6 });
                    this.render.names[id].text = player.name;
                    this.render.names[id].anchor.set(0.5);
                    this.render.text.addChild(this.render.names[id]);

                    this.render.names[10000 + id] = new PIXI.Text('', {font: '35px fontAwesome', fill: 'white', align: 'center', stroke: '#000000', strokeThickness: 6 });
                    if(player.type == 0)this.render.names[10000 + id].text = icons.power;
                    if(player.type == 1)this.render.names[10000 + id].text = icons.plus;
                    if(player.type == 2)this.render.names[10000 + id].text = icons.shield;
                    this.render.names[10000 + id].anchor.set(0.5);
                    this.render.text.addChild(this.render.names[10000 + id]);
                }

                // Name
                this.render.names[id].position.x = offset.x;
                this.render.names[id].position.y = offset.y - 100;

                this.render.names[10000 + id].style = {font: '35px fontAwesome', fill: levelColor.replace('0x', '#'), align: 'center', stroke: '#000000', strokeThickness: 6 }
                this.render.names[10000 + id].position.x = offset.x + 85;
                this.render.names[10000 + id].position.y = offset.y;


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
                    this.render.players.drawRect(offset.x - 50 * healthWidthMult, offset.y - 80, healthPercent * healthWidthMult, 12);
                    this.render.players.endFill();
                } else {// Draw Circle
                    // black border
                    this.render.players.lineStyle(14, healthColor.outline, this.data.config.health.alpha);
                    this.render.players.drawCircle(offset.x, offset.y, 80);

                    // Green
                    this.render.players.lineStyle(12, healthColor.full, this.data.config.health.alpha);
                    this.render.players.moveTo(offset.x + 80, offset.y);
                    this.render.players.arc(offset.x, offset.y, 80, 0, (Math.PI * 2) * (healthPercent/100), false);

                    // Red
                    this.render.players.lineStyle(12, healthColor.empty, this.data.config.health.alpha);
                    this.render.players.moveTo(offset.x + 80, offset.y);
                    this.render.players.arc(offset.x, offset.y, 80, 0, (Math.PI * 2) * (healthPercent/100), true);
                }




                // Player ship
                this.render.players.beginFill(this.color.numToColor(player.color));//levelColor);
                this.render.players.lineStyle(6, '0xFFFFFF', 0.5);
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
                    this.render.miniplayers.lineStyle(4, '0xffffff', 1);
                    this.render.miniplayers.moveTo(offset.x, offset.y - 13.2);
                    this.render.miniplayers.lineTo(offset.x + 10, offset.y + 6.6);
                    this.render.miniplayers.lineTo(offset.x - 10, offset.y + 6.6);
                    this.render.miniplayers.lineTo(offset.x, offset.y - 13.2);
                    this.render.miniplayers.endFill();
                }else{
                    // Other players
                    this.render.miniplayers.beginFill(this.color.numToColor(player.color));
                    this.render.miniplayers.lineStyle(4, '0xffffff', 1);
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
                var player = this.data.players.list['p' + owner];
                if(typeof player == 'undefined') return false;
                var age = frameTime - e[e.length -1];
                var levelColor = '0x000000';
                if(typeof player.levelColor != 'undefined') levelColor = player.levelColor;

                //this.render.lasers.beginFill('0xff0000');
                //this.render.lasers.alpha = (1 - age/laserTimeout) * 0.9;
                this.render.lasers.lineStyle((1 - age/laserTimeout) * 12, levelColor, 1);
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
        this.color.hslToRgb = (h,s,l)=>{//h0-1 s0-1 l(black range)0-0.5 l(white range)0.5-1
            var r, g, b;
            if(s == 0){
                r = g = b = l; // achromatic
            }else{
                var hue2rgb = function hue2rgb(p, q, t){
                    if(t < 0) t += 1;
                    if(t > 1) t -= 1;
                    if(t < 1/6) return p + (q - p) * 6 * t;
                    if(t < 1/2) return q;
                    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                };

                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)};
        };
        this.color.hslToHex = (h,s,l)=>{
            var x = this.color.hslToRgb(h, s, l);
            return this.color.rgbToHex(x.r, x.g, x.b);
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