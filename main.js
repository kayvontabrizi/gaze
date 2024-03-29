// skip password check when debugging
if (!utils.DEBUG) {
    // collect user input via simple prompt
    var pass = prompt("Password?", "<password goes here>");

    // throw exception if the user fails password prompt
    if (pass === null || md5(pass+'flarp') !== '4bc08f05a6320a858a64cba8f4d237d2') {
        throw new Error("Incorrect password!");
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////

// identify the room hash (generate if not given)
if (!location.hash) location.hash = Math.floor(Math.random()*0xFFFFFF).toString(16);
const room_hash = location.hash.substring(1);

// create ScaleDrone object and connect to channel
const drone = new ScaleDrone('LFHX9cAVqHdPv9Lh');

// construct room name from hash
const room_name = 'observable-'+room_hash;

// make synchronous XHR request
// NOTE: this is really lazy, but I don't wanna wrap everything for proper asynchronicity
let xhr = new XMLHttpRequest();
xhr.open("PUT", "https://global.xirsys.net/_turn/Endeavor", false);
please_dont_steal_me = btoa("ktabrizi:02f81666-01d1-11eb-a5a3-0242ac150002");
xhr.setRequestHeader("Authorization", "Basic " + please_dont_steal_me);
xhr.setRequestHeader("Content-Type", "application/json");
xhr.send(JSON.stringify({"format": "urls"}));
response = JSON.parse(xhr.responseText);

// create peer connection configuration
const pc_config = {
    iceServers: [
        {urls: 'stun:stun.stunprotocol.org:3478'},
        response.v.iceServers,
    ]
};

// track local and remote video objects
const local_video = document.querySelector("#local_video");
const remote_video = document.querySelector("#remote_video");

// create Room object to handle p2p communication and videochatting
let room = new Room(drone, room_name, pc_config, local_video, remote_video)

/////////////////////////////////////////////////////////////////////////////////////////////////////

// initialize youtube API
youtube_init();

// create main youtube player and local player objects
main_local_player = new LocalPlayer('local_player', room);
main_ytplayer = new YTPlayer('youtube_player', room, '3jWRrafhO7M');

// handle console submission
function onConsoleSubmit(event) {
    // extract input
    var input_elem = document.getElementById('input_url');
    var input = input_elem.value.trim();

    // extract ID from input
    var ID = input.includes('youtube') ? YTPlayer.URL2ID(input) : input;

    // switch to the room player to the youtube player
    room.switch('YTPlayer');

    // update the youtube player video
    room.player.cueByID(ID);

    // clear console input value
    input_elem.value = '';
};

// handle file selector change
function onFileChange(event) {
    // create an ObjectURL
    url = URL.createObjectURL(event.target.files[0]);

    // revoke any pre-existing ObjectURL
    if (local_player.src) URL.revokeObjectURL(local_player.src);

    // switch to the room player to the local player
    room.switch('LocalPlayer');

    // cue local player to load new video
    room.player.loadSRC(url);

    // clear file selector value
    event.target.value = '';
};

/////////////////////////////////////////////////////////////////////////////////////////////////////

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

    // bind url enter to console submission
    $('#input_url').keypress(event => {
        if(event.which == 13) {
            $(event.target).parent().submit();
            return false;
        }
    });

    // bind console url submission
    $('#console').submit(event => {
        // prevent default submission
        event.preventDefault();

        // trigger submission handler
        onConsoleSubmit(event);

        // return false for good measure
        return false;
    });

    // bind input file change
    $('#input_file').change(onFileChange);
});

// window onload event
window.onload = function () {
    // put panels to sleep
    $('.panel').trigger('mouseleave');
};