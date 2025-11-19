class Engine {
    start() {
        console.log("Engine started");
    }
}

class Wheel {
    rotate() {
        console.log("Wheel rotating");
    }
}

export class Car {
    private engine = new Engine();
    private wheels: Wheel[] = [new Wheel(), new Wheel(), new Wheel(), new Wheel()];

    drive() {
        this.engine.start();
        this.wheels.forEach(w => w.rotate());
    }
}
