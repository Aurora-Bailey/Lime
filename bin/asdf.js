
// On both the client and server:
var sp = require('schemapack');

var playerSchema = sp.build({p: [{
    id: 'varuint',
    transform: {
        position: {
            x: 'float64',
            y: 'float64',
            z: 'float64'
        },
        rotation: {
            x: 'float64',
            y: 'float64',
            z: 'float64',
            w: 'float64'
        }
    }
}, {
    id: 'varuint',
    transform: {
        position: {
            x: 'float64',
            y: 'float64',
            z: 'float64'
        },
        rotation: {
            x: 'float64',
            y: 'float64',
            z: 'float64',
            w: 'float64'
        }
    }
}]});


var player = {p: [{
    id: 0,
    transform: {
        position: {
            x: 2,
            y: 2.0000000004989023,
            z: -24.90756910131313
        },
        rotation: {
            x: 0.32514392007855847,
            y: -0.8798439564294107,
            z: 0.32514392007855847,
            w: 0.12015604357058937
        }
    }
}, {
    id: 1,
    transform: {
        position: {
            x: 7.490254936274141,
            y: 2.0000000004989023,
            z: -14.188117316225544
        },
        rotation: {
            x: 0,
            y: 0.018308020720336753,
            z: 0.1830802072033675,
            w: 0.9829274917854702
        }
    }
}]};


try{
    var buffer = playerSchema.encode(player);
    var str = buffer;
    console.log(str + ": " + str.length + " characters, " + Buffer.byteLength(str, 'utf8') + " bytes");

}
catch(err){

}

str = JSON.stringify(player);
console.log(str + ": " + str.length + " characters, " + Buffer.byteLength(str, 'utf8') + " bytes");

str = new Blob([JSON.stringify(player, null, 2)], {type : 'application/json'});
console.log(str + ": " + str.length + " characters, " + Buffer.byteLength(str, 'utf8') + " bytes");


