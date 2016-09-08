var version = 0.001,
    CLIENT_ENV = 'development',
    //CLIENT_ENV = 'production',
    compatible = '9ICXM7PGXJ',
    DOMAIN = 'zolt.io';

var settings = {};
if(typeof localStorage.settings !== 'undefined')
    settings = JSON.parse(localStorage.settings);

var serverList = ['45.79.85.50', '173.255.224.138'];
if(CLIENT_ENV == 'development') serverList.push('localhost:7777');
var serverActive = {};