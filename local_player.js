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

        // set initial source, load initial src if provided
        this.video.appendChild(this.source);
        if (init_src !== null) this.loadSRC(init_src);

        // set sync tolerance (seconds)
        this.tolerance = tolerance;
    }

    // set and load a video source
    loadSRC(src) {
        this.video.pause();
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
	return;
    }
}
