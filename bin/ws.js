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