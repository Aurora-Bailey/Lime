// Main
var __DEV = true;
var __DOMAIN = 'example.com';

class WS {
    static init(){
        this.server = null;
        this.connected = false;
        this.failCount = 0;

        this.startWebSocket();
    }

    static startWebSocket(){
        if(this.connected)//already connected.
            return false;

        if(__DEV){
            this.server = new WebSocket('ws://localhost:7777/');
        }else {
            this.server = new WebSocket('ws://ws.' + __DOMAIN + '/');
        }

        this.server.onopen = () => {
            this.failCount = 0;
            this.connected = true;
        };
        this.server.onclose = () => {
            this.connected = false;
            this.failCount++;
            let waitTime = (1000 * Math.random()) * this.failCount;
            setTimeout(() => this.startWebSocket(), waitTime);
        };
        this.server.onmessage = (e) => {
            console.log(JSON.parse(e.data));
        };
    }

    static sendObj(object){
        if(this.connected == false){
            alert('WebSocket is not connected.');
            return false;
        }
        this.server.send(JSON.stringify(object));
    }
}
WS.init();