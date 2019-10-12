// // throw exception if the user fails simple password prompt
// var pass = prompt("Password?", "<password goes here>");
// if (pass === null || md5(pass+'flarp') !== '4bc08f05a6320a858a64cba8f4d237d2') {
//     throw new Error("Incorrect password!");
// }

/////////////////////////////////////////////////////////////////////////////////////////////////////

// identify the room hash (generate if not given)
if (!location.hash) location.hash = Math.floor(Math.random()*0xFFFFFF).toString(16);
const room_hash = location.hash.substring(1);

// create ScaleDrone object and connect to channel
const drone = new ScaleDrone('LFHX9cAVqHdPv9Lh');

// construct room name from hash
const room_name = 'observable-'+room_hash;

// create peer connection configuration
const pc_config = {
    // iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
    iceServers: [{urls: 'stun:stun.stunprotocol.org:3478'}]
};

// track local and remote video objects
const local_video = document.querySelector("#local_video");
const remote_video = document.querySelector("#remote_video");

// create Room object to handle p2p communication and videochatting
let room = new Room(drone, room_name, pc_config, local_video, remote_video)

/////////////////////////////////////////////////////////////////////////////////////////////////////

// initialize youtube API
youtube_init();

// create main global youtube player and set as room player
room.player = new YTPlayer('youtube_player', '3jWRrafhO7M');

// handle console submission
function onConsoleSubmit(event) {
    // extract input
    var input = $('input[name=url]')[0].value;

    // extract ID from input
    var ID = input.includes('youtube') ? YTPlayer.URL2ID(input) : input;

    // update the youtube player video
    room.player.cueByID(ID);
};

// instatiate a global timer for panel handle disappearance
var timerID = null;

// display panel handles
function panelAwaken() {
    var panel = $(this);
    panel.children('.ui-resizable-handle').css('background', '');
    if (timerID !== null) clearTimeout(timerID);
    timerID = setTimeout(() => panel.trigger('mouseleave'), 1500);
};

// disappear panel handles
function panelSleep() {
    $(this).children('.ui-resizable-handle').css('background', 'none');
};

// jQuery DOM ready
$(() => {
    // bind awake/sleep functions to panel mouse/move/enter
    $('.panel').each(function () {
        $(this).mousemove(panelAwaken).mouseenter(panelAwaken).mouseleave(panelSleep);
    });

    // make panel elements draggable
    $('.panel').draggable({containment: 'parent'})
    .resizable({containment: 'parent', handles: 'all'});

    // set resize handle z-indices according to parents
    $('.ui-resizable-handle').each(function () {
        $(this).css('z-index', Number($(this).parent().css('z-index'))+1);
    });

    // disable context menu for listed elements
    ['.ui-resizable-handle', local_video, remote_video].forEach(element => {
        // bind mousedown handler
        $(element).mousedown(event => {
            // detect right click (including control-click)
            right_click = event.which === 3 || (event.which === 1 && event.ctrlKey);

            // overwrite contextmenu function if right click
            if (right_click) $(this).contextmenu(() => { return false; });

            // otherwise unbind the overwritten function
            else $(this).unbind('contextmenu');
        })
    });

    // track state of the tilde
    var tilde_down;

    // bind keydown anywhere
    $(document).keydown(event => {
        // detect tilde press
        if(event.key === '~') {
            // dodge repeat events
            if (tilde_down) return;

            // otherwise perform tilde action
            else {
                // note that tilde is pressed
                tilde_down = true;

                // toggle console
                $('#console').toggle();
            }
        }
    });

    // bind keyup anywhere
    $(document).keyup(event => {
        // detect tilde lifted and note
        if(event.key === '~') tilde_down = false;
    });

    // bind console url submission
    $('form#console').submit(event => {
        // prevent default submission
        event.preventDefault();

        // trigger submission handler
        onConsoleSubmit(event);

        // return false for good measure
        return false;
    });

});

// window onload event
window.onload = function () {
    // put panels to sleep
    $('.panel').trigger('mouseleave');
};