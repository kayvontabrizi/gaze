// inserts and loads the YouTube API
youtube_init = (function () {
    // asynchronously load the iframe player API
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});

// track YTPlayers and whether or not the iframe API is ready
YT_API_ready = false;
YTPlayers = {};

// handles API ready event
function onYouTubeIframeAPIReady() {
    // record that API is ready
    YT_API_ready = true;

    // loop through YTPlayers and create each
    for (var key in YTPlayers) {
        var yt_player = YTPlayers[key];
        yt_player.player = new YT.Player(yt_player.element_ID, yt_player.params);
    }
};

// define a YTPlayer class
class YTPlayer extends Player {
    // define state translation dictionary
    static get STATES () {
        return {
            '-1': 'unstarted',
            '0': 'ended',
            '1': 'playing',
            '2': 'paused',
            '3': 'buffering',
            '5': 'video cued',
        };
    }

    // extract ID from youtube URL
    static URL2ID(URL) {
        if (URL.includes('v=')) {
            var ID = URL.split('v=')[1];
            if (ID.indexOf('&') != -1) ID = ID.substring(0, ID.indexOf('&'));
        } else {
            var ID = URL.split('?')[0].split('/');
            ID = ID[ID.length-1];
        }
        return ID;
    }

    // generate youtube URL given ID
    static ID2URL(ID) {
        return 'http://www.youtube.com/v/'+ID+'?version=3';
    }

    // generates state object given a player object
    static getState(player) {
        // handle undefined player state
        var state = 'paused';
        if (player.getPlayerState() !== undefined) {
            state = YTPlayer.STATES[player.getPlayerState().toString()];
        }

        // return a dictionary with player state info
        return {
            'state': state,
            'time': player.getCurrentTime(),
            'type': 'youtube',
            'ID': player.getVideoData()['video_id'],
        };
    }

    // handles player ready event
    static onPlayerReady(event) {
        // identify YT Player object
        var yt_player = YTPlayers[event.target.a.id];

        // set player readiness to true
        yt_player.ready = true;

        // place most recently queued video
        if (yt_player.queue.length > 0) yt_player.loadByID(yt_player.queue.pop());
    }

    // handles player state changes
    static onStateChange(event) {
        room.publish({'player_state': YTPlayer.getState(event.target)});
    }

    // constructor verifies parameters and creates a YT.Player object
    constructor(element_ID, video_ID, height='100%', width='100%', tolerance=3) {
        // verify element ID exists and store
        if (!!document.getElementById(element_ID)) this.element_ID = element_ID;
        else utils.error("Element doesn't exist!");

        // store params, initialize null player and video queue, track player readiness
        this.params = {
            height: height,
            width: width,
            videoId: video_ID,
            events: {
                'onStateChange': YTPlayer.onStateChange,
                'onReady': YTPlayer.onPlayerReady,
            }
        };
        this.player = null;
        this.queue = [];
        this.ready = false;

        // set sync tolerance (seconds)
        this.tolerance = tolerance;

        // if api ready, create a YT.Player object
        if (YT_API_ready) this.player = new YT.Player(this.element_ID, this.params);

        // append player to YTPlayers list for tracking
        YTPlayers[element_ID] = this;
    }

    // cue a video given an ID
    cueByID(ID) {
        // load the video if ready
        if (this.ready) this.loadByID(ID);

        // otherwise add to queue
        else this.queue.push(ID);
    }

    // load a video given an ID
    loadByID(ID) {
        this.player.loadVideoById(ID);
    }

    // // generates state object
    // getState() {
    //     // handle undefined player state
    //     if (this.player.getPlayerState() === undefined) state = 'paused';
    //     else var state = YTPlayer.STATES[this.player.getPlayerState().toString()];

    //     // return a dictionary with player state info
    //     return {
    //         'state': state,
    //         'time': this.player.getCurrentTime(),
    //         'type': 'youtube',
    //         'ID': this.player.getVideoData()['video_id'],
    //     };
    // }

    // adjust player given new state
    syncPlayerState(new_state) {
        // get current player and state
        var player = this.player;
        var old_state = getState(player);

        // switch video if necessary
        if (new_state['ID'] != old_state['ID']) this.cueByID(new_state['ID']);

        // adjust time if necessary
        var time_diff = Math.abs(old_state['time']-new_state['time']);
        if (time_diff > this.tolerance) player.seekTo(new_state['time'], true);

        // play if new_state is 'playing' and old state is neither 'playing' nor 'buffering'
        if (new_state['state'] == 'playing' &&
            !['playing', 'buffering'].includes(old_state['state'])) player.playVideo();

        // pause if new_state is 'paused' and old state is 'playing' or 'buffering'
        if (new_state['state'] == 'paused' &&
            ['playing', 'buffering'].includes(old_state['state'])) player.pauseVideo();
    }
}