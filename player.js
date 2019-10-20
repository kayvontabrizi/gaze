// define an abstract Player class
class Player {
    // constructor prevents direct construction and ensures subclass method implementations
    constructor() {
        // verify constructed object is not a direct instance of Player
        if (new.target === Player) {
            utils.error("Cannot directly construct abstract Player instance!");
        }

        // provide brief documentation for each method
        var docstrings = {
            'close': "This method should stop and hide the video player.",
            'open': "This method should show the video player.",
            'load': "This method should load a video given identifying data.",
            'syncState': "This element should accept a state object and update the player state.",
            'onStateChange': "This method should trigger whenever state info needs publishing.",
        };

        // loop through expected methods
        for (var method in docstrings) {
            // check whether method was implemented
            if (this[method] === undefined) {
                // ensure method has been overwritten
                utils.error("The '"+method+"' method must be implemented!\n"+docstrings[method]);
            }
        }
    }
}