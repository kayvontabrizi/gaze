// utils class to hold utility methods
class utils {
    // basic logging function
    static log(msg) {
        // if provided, log message in console
        if (msg) console.log(msg);
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