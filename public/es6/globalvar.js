var version = 0.001,
    CLIENT_ENV = 'production',
    compatible = '9ICXM7PGXJ',
    DOMAIN = 'yoza.io';

var settings = {};
if(typeof localStorage.settings !== 'undefined')
    settings = JSON.parse(localStorage.settings);

var serverList = ['45.79.85.50', '173.255.224.138', '173.255.205.190', '139.162.169.244', '139.162.56.151'];
var serverActive = {};