var asdf = [1,2,1,2,2,21,2,1,1,2,2,2];

console.log(asdf);
for(var k=0; k<asdf.length; k++){
    console.log(k);
    if(asdf[k] == 2){
        asdf.splice(k,1);
        k--;
    }

}
console.log(asdf);

/*
asdf.forEach(function(e,i){
    console.log(i, e);
    if(e == 2)
        asdf.splice(i,1);
});
console.log(asdf);
    */