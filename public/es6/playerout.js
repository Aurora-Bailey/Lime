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