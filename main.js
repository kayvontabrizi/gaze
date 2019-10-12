// // throw exception if the user fails simple password prompt
// var pass = prompt("Password?", "<password goes here>");
// if (pass === null || md5(pass+'flarp') !== '4bc08f05a6320a858a64cba8f4d237d2') {
//     throw new Error("Incorrect password!");
// }

/////////////////////////////////////////////////////////////////////////////////////////////////////

// error handling function
function logError(error) {
    // log and return if any error
    if (error) return console.error(error);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////

// generate hash if not given
if (!location.hash) location.hash = Math.floor(Math.random()*0xFFFFFF).toString(16);

// identify the room hash
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

// asynchronously load the iframe player API
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// track YTPlayers and whether or not the iframe API is ready
var YTPlayers = {};
var YT_API_ready = false;

// define an acceptable sync tolerance (seconds)
const tolerance = 3;

// define a YTPlayer class
class YTPlayer {
    // constructor verifies parameters and creates a YT.Player object
    constructor(element, ID, height='100%', width='100%') {
        // verify element exists and store
        if (element) this.element = element;
        else logError("Element doesn't exist!");

        // store params, initialize null player and video queue, track player readiness
        this.params = {
            height: height,
            width: width,
            videoId: ID,
            events: {
                'onStateChange': onStateChange,
                'onReady': onPlayerReady,
            }
        };
        this.player = null;
        this.queue = [];
        this.ready = false;

        // if api ready, create a YT.Player object
        if (YT_API_ready) this.player = new YT.Player(this.element, this.params);

        // append player to YTPlayers list for tracking
        YTPlayers[element] = this;
    };

    // cue a video given an ID
    cueByID(ID) {
        // load the video if ready
        if (this.ready) this.loadByID(ID);

        // otherwise add to queue
        else this.queue.push(ID);
    };

    // load a video given an ID
    loadByID(ID) {
        this.player.loadVideoById(ID);
    };
};

// handles API ready event
function onYouTubeIframeAPIReady() {
    // record that API is ready
    YT_API_ready = true;

    // loop through YTPlayers and create each
    for (var key in YTPlayers) {
        var yt_player = YTPlayers[key];
        yt_player.player = new YT.Player(yt_player.element, yt_player.params);
    }
};

// handles player ready event
function onPlayerReady(event) {
    // identify YT Player object
    yt_player = YTPlayers[event.target.a.id]

    // set player readiness to true
    yt_player.ready = true;

    // place most recently queued video
    if (yt_player.queue.length > 0) yt_player.loadByID(yt_player.queue.pop());
};

// define state translation dictionary
var states = {
    '-1': 'unstarted',
    '0': 'ended',
    '1': 'playing',
    '2': 'paused',
    '3': 'buffering',
    '5': 'video cued',
};

// generates state object
function getState(player) {
    // // return and log error if player state undefined
    // if (player.getPlayerState() === undefined) return logError(player);

    // handle undefined player state
    if (player.getPlayerState() === undefined) state = 'paused';
    else state = states[player.getPlayerState().toString()];

    // return a dictionary with player state info
    return {
        'state': state,
        'time': player.getCurrentTime(),
        'type': 'youtube',
        'ID': player.getVideoData()['video_id'],
    };
};

// handles player state changes
function onStateChange(event) {
    room.publish({'player_state': getState(event.target)});
};

// adjust player given new state
function syncPlayerState(new_state) {
    // get current player and state
    var player = mainYT.player;
    var old_state = getState(player);

    // switch video if necessary
    if (new_state['ID'] != old_state['ID']) mainYT.cueByID(new_state['ID']);

    // adjust time if necessary
    var time_diff = Math.abs(old_state['time']-new_state['time']);
    if (time_diff > tolerance) player.seekTo(new_state['time'], true);

    // play if new_state is 'playing' and old state is neither 'playing' nor 'buffering'
    if (new_state['state'] == 'playing' &&
        !['playing', 'buffering'].includes(old_state['state'])) player.playVideo();

    // pause if new_state is 'paused' and old state is 'playing' or 'buffering'
    if (new_state['state'] == 'paused' &&
        ['playing', 'buffering'].includes(old_state['state'])) player.pauseVideo();
};

/////////////////////////////////////////////////////////////////////////////////////////////////////

// create main global youtube player
var mainYT = new YTPlayer('youtube_player', '3jWRrafhO7M');

// extract ID from youtube URL
function URL2ID(URL) {
    if (URL.includes('v=')) {
        var ID = URL.split('v=')[1];
        if (ID.indexOf('&') != -1) ID = ID.substring(0, ID.indexOf('&'));
    } else {
        var ID = URL.split('?')[0].split('/');
        ID = ID[ID.length-1];
    }
    return ID;
};

// generate youtube URL given ID
function ID2URL(ID) {
    return 'http://www.youtube.com/v/'+ID+'?version=3';
};

// handle console submission
function onConsoleSubmit(event) {
    // extract input
    var input = $('input[name=url]')[0].value;

    // extract ID from input
    var ID = input.includes('youtube') ? URL2ID(input) : input;

    // update the video
    mainYT.cueByID(ID);
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