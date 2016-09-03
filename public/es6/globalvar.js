var DEV = true,
    version = 0.001,
    compatible = '9ICXM7PGXJ',
    DOMAIN = 'yoza.io';

var settings = {};
if(typeof localStorage.settings !== 'undefined')
    settings = JSON.parse(localStorage.settings);

var serverList = ['192.168.0.3:7777','192.168.0.3:7777','192.168.0.3:7777'];
var serverActive = {};