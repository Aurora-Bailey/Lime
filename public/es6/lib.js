class Lib {
    static objectKeyArray(obj){
        var arr = [];

        for(var key in obj)
            arr.push(key);

        return arr;
    }

    // Takes an object (obj.a = 10 obj.b = 20 etc...) returns the random key (b)
    static weightedRandom(obj){
        var total = 0;
        for(var key in obj)
            total += obj[key];

        var r = Math.random() * total;

        for(var key in obj){
            if(r < obj[key])
                return key;
            r -= obj[key];
        }
    }

    static randomProperty(obj){
        var total = 0;
        for(var key in obj)
            total += 1;

        var r = Math.random() * total;

        for(var key in obj){
            if(r < 1)
                return obj[key];
            r -= 1;
        }
    }

    static inCommonProperty(obj, obj2){
        var r = {};
        for(var key in obj)
            if(typeof obj2[key] !== 'undefined')
                r[key] = obj[key];

        return r;
    }

    static notProperty(obj, exclude_arr){
        var r = {};
        for(var key in obj)
            if(exclude_arr.indexOf(key) == -1)
                r[key] = obj[key];

        return r;
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

    static socialMediaPost(site, url){
        if(site == 'facebook')
            window.open('http://www.facebook.com/share.php?u=' + url, 'Facebook', 'width=550,height=400');
        else if(site == 'twitter')
            window.open('http://twitter.com/intent/tweet?status=' + $(document).find("title").text() + '+' + url, 'Twitter', 'width=550,height=400');
    }
}