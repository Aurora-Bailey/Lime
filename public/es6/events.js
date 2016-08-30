// Events
$('#enter-name-input').on('keyup', function(){
    PO.name = $(this).val();
});
$('.type-button').on('click', function(){
    PO.type = $(this).attr('data-value');
    WS.startWebSocket();
});

$('#respawn-button').on('click', function(){
    if(WS.connected){
        WS.server.send(JSON.stringify({m: 'respawn'}));
    }
    $('#respawn').addClass('hide');
});
$('#respawn-leave').on('click', function(){
    if(WS.connected){
        WS.server.close();
    }
    $('#respawn').addClass('hide');
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
    if(!PO.chatMode){
        if(e.keyCode == 87){
            PO.weapon(true);
        }else if(e.keyCode == 32){
            PO.thrust(true);
        }
    }

    if(e.keyCode == 13 || e.keyCode == 9){
        return false;
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
    if(e.keyCode == 13 || e.keyCode == 9){
        if(PO.chatMode){
            var msg = $('#actual-chat-box').val();
            if(!Game.executeMessage(msg)){
                PO.tick.message = msg;
                PO.tickchanged = true;
            }
            PO.chatMode = false;
            $('#enter-chat').addClass('hide');
            $('#actual-chat-box').blur().val('');
        }else{
            PO.chatMode = true;
            $('#enter-chat').removeClass('hide');
            $('#actual-chat-box').focus();
        }
        return false;
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