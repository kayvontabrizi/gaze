// define a LocalPlayer class
class LocalPlayer extends Player {
    // constructor verifies parameters and creates a LocalPlayer object
    constructor(element_ID, init_src=null, tolerance=3) {
        // initialize superclass
        super();

        // verify element ID exists and store
        if (!!document.getElementById(element_ID)) this.element_ID = element_ID;
        else utils.error("Element doesn't exist!");

        // identify video element and create source element
        this.video = document.getElementById(element_ID);
        this.source = document.createElement('source');

        // load initial src, if provided
        if (init_src !== null) this.loadSRC(init_src);

        // set sync tolerance (seconds)
        this.tolerance = tolerance;

        // list events
        var events = {
            'abort':
                "Fired when the resource was not fully loaded, but not as the result of an error.",
            'canplay':
                "Fired when the user agent can play the media, but estimates that not enough data has been loaded to play the media up to its end without having to stop for further buffering of content.",
            'canplaythrough':
                "Fired when the user agent can play the media, and estimates that enough data has been loaded to play the media up to its end without having to stop for further buffering of content.",
            'durationchange':
                "Fired when the duration attribute has been updated.",
            'emptied':
                "Fired when the media has become empty; for example, when the media has already been loaded (or partially loaded), and the HTMLMediaElement.load() method is called to reload it.",
            'ended':
                "Fired when playback stops when end of the media (<audio> or <video>) is reached or because no further data is available.",
            'error':
                "Fired when the resource could not be loaded due to an error.",
            'loadstart':
                "Fired when the browser has started to load a resource.",
            'pause':
                "Fired when a request to pause play is handled and the activity has entered its paused state, most commonly occurring when the media's HTMLMediaElement.pause() method is called.",
            'play':
                "Fired when when the paused property is changed from true to false, as a result of the HTMLMediaElement.play() method, or the autoplay attribute.",
            'playing':
                "Fired when playback is ready to start after having been paused or delayed due to lack of data.",
            'ratechange':
                "Fired when the playback rate has changed.",
            'seeked':
                "Fired when a seek operation completes.",
            'waiting':
                "Fired when playback has stopped because of a temporary lack of data.",
        };

        // add listeners for listed events
        for (var event in events) {
            this.video.addEventListener(event, (event) => {
                this.onStateChange(event);
            });
        }
    }

    // publish state change to room
    onStateChange(event) {
        // events requiring syncing
        var synced_events = {
            'loadstart': this.source.src,
            'pause': null,
            'play': null,
            'ratechange': this.video.playbackRate,
            'seeked': this.video.currentTime,
            'waiting': null,
        }

        // check for synced events
        if (event.type in synced_events) {
            //
            room.publish({
                'player_state': [event.type, synced_events[event.type]]
            });
        }
    }

    // set and load a video source
    loadSRC(src) {
        this.video.pause();
        if (!this.video.hasChildNodes(this.source)) {
            this.video.appendChild(this.source);
        }
        this.source.setAttribute('src', src);
        utils.log(this.source);
        this.video.load();
    }

    // hide player
    close() {
        // stop any playing video
        this.video.pause();

        // get player element and hide
        document.getElementById(this.element_ID).style.display = 'none';
    }

    // hide player
    open() {
        // get player element and hide
        document.getElementById(this.element_ID).style.display = '';
    }

    // load a video
    load(data) {
        loadSRC(data);
    }

    // adjust player given new state object
    syncState(new_state) {
        //
        utils.log(new_state);
        var event_type = new_state[0];
        var event_data = new_state[1];

        // handle the various event types
        switch(expression) {
            case event_type == 'play':
                this.video.play();
            break;
            case ['pause', 'waiting'].includes(event_type):
                this.video.pause();
            break;
            case event_type == 'seeked':
                this.video.currentTime = event_data;
            break;
            default:
                utils.log(event_type);
                utils.log(event_data);
            // code block
        }
    }
}
