class Lib {
    static randString(length, lower, upper, numbers){
        var text = "";
        var possible = "";
        var possLower = 'abcdefghijklmnopqrstuvwxyz';
        var possUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var possNum = '0123456789';

        if(lower)
            possible += possLower;
        if(upper)
            possible += possUpper;
        if(numbers)
            possible += posNum;

        for( var i=0; i < length; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    static saveSettings(){
        localStorage.settings = JSON.stringify(settings);
    }

    // Takes an object (obj.a = 10 obj.b = 20 etc...) returns the random key (b)
    static weightedRandom(obj){
        var total = 0;
        for(let k in obj)
            total += obj[k];

        var r = Math.random() * total;

        for(let key in obj){
            if(r < obj[key])
                return key;
            r -= obj[key];
        }
    }

    static deepCopy(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    static isObjEmpty(obj){
        // null and undefined are "empty"
        if(obj == null)
            return true;

        // Assume if it has a length property with a non-zero valuehttp%3A%2F%2Flocalhost%3A4000%2F
        // that that property is correct.
        if(obj.length > 0)
            return false;
        if(obj.length === 0)
            return true;

        // Otherwise, does it have any properties of its own?
        // Note that this doesn't handle
        // toString and valueOf enumeration bugs in IE < 9
        for(var key in obj){
            if (obj.hasOwnProperty(key))
                return false;
        }

        return true;
    }

    static numToColorNameProper(num){
        var colors = ['White','Purple','Blue','Green','Yellow','Orange','Red'];

        if(typeof colors[num] !== 'undefined')
            return colors[num];
        else{
            return colors[0];
        }
    }

    static colorToNum(c){
        c = c.toLowerCase();
        var colors = {white: 0, purple: 1, blue: 2, green: 3, yellow: 4, orange: 5, red: 6};

        if(typeof colors[c] !== 'undefined')
            return colors[c];
        else{
            return colors['white'];
        }
    }

    static betweenTwoNum(fromNum, toNum, zeroToOneComplete){
        var distance = toNum - fromNum;
        return fromNum + (distance * zeroToOneComplete);
    }

    static socialMediaPost(site, url){
        if(site == 'facebook')
            window.open('http://www.facebook.com/share.php?u=' + url, 'Facebook', 'width=550,height=400');
        else if(site == 'twitter')
            window.open('http://twitter.com/intent/tweet?status=' + url, 'Twitter', 'width=550,height=400');
    }
}