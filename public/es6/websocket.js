class WebSocketClass {
    constructor(){
        this.server = 0;
        this.connected = false;
    }

    startWebSocket(){
        if(this.connected)//already connected.
            return false;

        var bestServer = false;
        if(typeof serverActive[PO.server.toLowerCase()] !== 'undefined'){// try the users server
            bestServer = serverActive[PO.server.toLowerCase()];
        }else{
            for(let key in serverActive){// pick server with lowest ping
                if (!serverActive.hasOwnProperty(key)) continue;// skip loop if the property is from prototype

                if(bestServer === false){
                    bestServer = serverActive[key];
                }else{
                    if(bestServer.ping > serverActive[key].ping && serverActive[key].capacity < 100 || bestServer.capacity > 100 && serverActive[key].capacity < 100){
                        bestServer = serverActive[key];
                    }
                }
            }
        }

        if(bestServer === false) return false;

        this.server = new WebSocket('ws://' + bestServer.ip + '/' + encodeURI(PO.room.toLowerCase()));

        this.server.binaryType = 'arraybuffer';

        this.server.onopen = () => {
            this.connected = true;
            this.sendObj({m: 'compatible', v: compatible, wantcolor: PO.color});
        };
        this.server.onclose = () => {
            this.connected = false;
            PO.ready = false;
            $('#homepage').removeClass('hide');
            $('#maingame').addClass('hide');
            $('#waiting').addClass('hide');
            Lib.pingWebSocket();
        };
        this.server.onmessage = (e) => {
            var d = e.data;
            if(typeof e.data == 'string'){
                d = JSON.parse(d);
                if(CLIENT_ENV == 'development') console.log(d);
                if(d.m == 'compatible'){
                    if(d.v == false) alert('Your game is out of date, try refreshing the browser.');
                }else if(d.m == 'ready'){
                    $('#waiting').addClass('hide');
                    this.sendObj({m: 'start', n: PO.name, t: PO.type});
                }else if(d.m == 'wait'){
                    $('#waiting').removeClass('hide');
                }else if(d.m == 'go'){
                    Game.data.players.list = d.players;
                    Game.data.myId = d.id;
                    Game.data.serverName = d.server;
                    Game.data.roomName = d.room;
                    Game.data.map = d.map;
                    Game.data.serverTick = d.tick;
                    Game.data.minimapTick = d.minitick;
                    Game.data.config.blocksize = d.block;
                    Game.draw.map();
                    Game.draw.minimap();
                    PO.ready = true;
                    $('#homepage').addClass('hide');
                    $('#maingame').removeClass('hide');
                    $('#chat-log').html('');
                    Game.chatMessage("Press [Enter] to open/close chat.", 'game');
                    Game.chatMessage("You can only chat with " + Lib.numToColorNameProper(Game.data.players.list['p' + Game.data.myId].color) + " players.", 'game');

                    $('#friend-link').find('span')
                        .html(DOMAIN + '/#' + d.server + '-' + d.room + '-' + Lib.numToColorNameProper(Game.data.players.list['p' + Game.data.myId].color));
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

                if(x[0] == 5){// rank change
                    Game.data.oldPlayers.rank = Game.data.players.rank;
                    Game.data.players.rank = WS.unpackBinary(d, 16);

                    Game.data.players.rank.sort(function(a, b){
                        if(a[1] < b[1])
                            return 1;
                        if (a[1] > b[1])
                            return -1;
                        return 0;// a must be equal to b
                    });

                    $('#ranks').html('');
                    Game.data.players.rank.forEach((e,i)=>{
                        var id = e[0];
                        Game.data.players.list['p' + id].rank = e[1];
                        Game.data.players.list['p' + id].level = e[2];

                        // calculate what color the level is
                        var flipLevelColor = 2 - parseFloat(e[2])/3000;
                        var modLevelColor = (flipLevelColor + 0.35) % 1;
                        Game.data.players.list['p' + id].levelColor = Game.color.hslToHex(modLevelColor, 1, 0.5);


                        // class to be added only to the players rank
                        var myRank = '';
                        if(id == Game.data.myId){
                            myRank = 'myrank';

                        }

                        // add to rank board
                        if(e[1] <= 10){
                            $('#ranks').prepend(
                                $('<div />')
                                    .addClass(Lib.numToColorNameProper(Game.data.players.list['p' + id].color).toLowerCase())
                                    .addClass(myRank)
                                    .append(
                                        $('<span />')
                                            .text('' + e[1] + ' - ')
                                    )
                                    .append(
                                        $('<span />')
                                            .text(Game.data.players.list['p' + id].name)
                                    )

                            );
                        }else if(id == Game.data.myId){
                            $('#ranks').append(
                                $('<div />')
                                    .addClass(Lib.numToColorNameProper(Game.data.players.list['p' + id].color).toLowerCase())
                                    .addClass(myRank)
                                    .append(
                                        $('<span />')
                                            .text('' + e[1] + ' - ')
                                    )
                                    .append(
                                        $('<span />')
                                            .text(Game.data.players.list['p' + id].name)
                                    )

                            );
                        }

                    });
                    // id rank level
                }

                if(x[0] == 6){// minimap change
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