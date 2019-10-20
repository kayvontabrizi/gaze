// utils class to hold utility methods
class utils {
    // basic alert function
    static alert(msg) {
        // alert message
        alert(msg);
    }

    // basic logging function
    static log(msg) {
        // log message in console
        console.log(msg);
    }

    // conditional debug logging
    static debug(msg) {
        // if debug is true, log message
        if (utils.DEBUG === true) utils.log(msg);
    }

    // warning handling function
    static warning(msg) {
        // log error message in console
        console.error(msg);
    }

    // error handling function
    static error(msg) {
        // throw an error with the given message
        throw new Error(msg);
    }
}

// set class properties
utils.DEBUG = false;