// define an abstract Player class
class Player {
    // constructor prevents direct construction and ensures subclass method implementations
    constructor() {
        // verify constructed object is not a direct instance of Player
        if (new.target === Player) {
            throw new TypeError("Cannot directly construct abstract Player instance!");
        }
    }

//     //
// throw new Error('You have to implement the method doSomething!');

}