// Events
$('#enter-name-input').on('keyup', function(){
    PO.name = $(this).val();
});
$('.type-button').on('click', function(){
    PO.type = $(this).attr('data-value');
    WS.startWebSocket();
});


$(window).on('mousedown', function(e){
    if(!PO.ready)return true;
    if(e.button == 0){
        PO.weapon(true);
    }else if(e.button == 2){
        PO.thrust(true);
    }

});
$(window).on('mouseup', function(e){
    if(!PO.ready)return true;
    if(e.button == 0){
        PO.weapon(false);
    }else if(e.button == 2){
        PO.thrust(false)
    }
});
$(window).on('keydown', function(e){
    if(!PO.ready)return true;
    if(e.keyCode == 13){
        if(PO.chatMode){
            PO.tick.message = PO.chatText;
            PO.tickchanged = true;
            PO.chatMode = false;
            PO.chatText = '';
        }else{
            PO.chatMode = true;
        }
    }else{
        if(PO.chatMode){
            if(e.keyCode > 31 && e.keyCode < 127)
                PO.chatText += e.key;
            if(e.keyCode == 8)
                PO.chatText = PO.chatText.slice(0, -1);
        }else{
            if(e.keyCode == 87){
                PO.weapon(true);
            }else if(e.keyCode == 32){
                PO.thrust(true);
            }
        }
    }
});
$(window).on('keyup', function(e){
    if(!PO.ready)return true;
    if(!PO.chatMode){
        if(e.keyCode == 87){
            PO.weapon(false);
        }else if(e.keyCode == 32){
            PO.thrust(false);
        }
    }

});
$(window).on('mousemove', function(e){
    if(!PO.ready)return true;
    var mouse = {X: e.clientX, Y: e.clientY};
    var screen = {W: $(window).width(), H: $(window).height()};
    var delta = {X: mouse.X - (screen.W / 2), Y: mouse.Y - (screen.H / 2)};
    var rad = Math.atan2(delta.Y, delta.X);
    PO.tick.direction = Math.floor(rad * 1000);
    PO.tickchanged = true;
});