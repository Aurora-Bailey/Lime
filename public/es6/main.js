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

        this.server.onopen = () => {
            this.connected = true;
            $('#homepage').addClass('hide');
            $('#maingame').removeClass('hide');
            this.sendObj({m: 'compatible', v: compatible});
        };
        this.server.onclose = () => {
            this.connected = false;
            PO.ready = false;
            $('#homepage').removeClass('hide');
            $('#maingame').addClass('hide');
        };
        this.server.onmessage = (e) => {
            var d = JSON.parse(e.data);
            console.log(d);
            if(d.m == 'compatible'){
                if(d.v == false) alert('Your game is out of date, try refreshing the browser.');
            }else if(d.m == 'ready'){
                this.sendObj({m: 'start', n: PO.name, t: PO.type});
            }else if(d.m == 'go'){
                PO.ready = true;
                var playerId = d.v;
            }else if(d.m == "ping"){
                console.log(Date.now() - parseInt(d.v));
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

