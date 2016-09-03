// Events
$('#enter-name-input').on('change', function(){
    PO.name = $(this).val();
    settings.name = PO.name;
    Lib.saveSettings();
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


$('#waiting-cancel').on('click', function(){
    if(WS.connected){
        WS.server.close();
    }
});

$('#friend-link').on('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    $(this).find('span').select();
});

$('#enter-server-input').on('change', function(){
    var x = $('#enter-server-input').val();
    x = x.replace('#', '');

    var arr = x.split('-');

    if(typeof arr[0] != 'undefined' && arr[0].length > 0){
        PO.server = arr[0];
    }
    if(typeof arr[1] != 'undefined' && arr[1].length > 0){
        PO.room = arr[1];
    }
    if(typeof arr[2] != 'undefined' && arr[2].length > 0){
        PO.color = Lib.colorToNum(arr[2]);
    }

});

$(window).on('mousedown', function(e){
    if(!PO.ready)return true;
    if(e.button == 0){
        PO.weapon(true);
    }else if(e.button == 2){
        PO.thrust(true);
    }
    return true;

});
$(window).on('mouseup', function(e){
    if(!PO.ready)return true;
    if(e.button == 0){
        PO.weapon(false);
    }else if(e.button == 2){
        PO.thrust(false)
    }
    return true;
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

$('document').ready(function(){
    if(window.location.hash != ''){
        $('#enter-server-input').val(window.location.hash).trigger('change');
        window.location.hash = '';
    }

    if(typeof settings.name !== 'undefined'){
        $('#enter-name-input').val(settings.name).trigger('change');
    }
});
$(window).on('unload', function(){
    //asdf
});

var flipTutorial = function(){
    var $showing = $('#tutorial').find('.show').addClass('hide').removeClass('show');
    if($showing.next().length > 0)
        $showing.next().addClass('show').removeClass('hide');
    else
        $('#tutorial').find('div').first().addClass('show').removeClass('hide');
    window.setTimeout(flipTutorial, 7000);
};
window.setTimeout(flipTutorial, 7000);
