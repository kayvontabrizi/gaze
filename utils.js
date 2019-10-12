// utils class to hold utility methods
class utils {
    // basic logging function
    static log(msg) {
        // log message in console
        return console.log(msg);
    }

    // error handling function
    static error(error) {
        // log and return if any error
        if (error) return console.error(error);
    }
}