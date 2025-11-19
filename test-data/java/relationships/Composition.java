package com.example.relationships;

import java.util.ArrayList;
import java.util.List;

class Engine {
    public void start() {
        System.out.println("Engine started");
    }
}

class Wheel {
    public void rotate() {
        System.out.println("Wheel rotating");
    }
}

public class Composition {
    private Engine engine;
    private List<Wheel> wheels;

    public Composition() {
        this.engine = new Engine();
        this.wheels = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            this.wheels.add(new Wheel());
        }
    }

    public void drive() {
        engine.start();
        for (Wheel wheel : wheels) {
            wheel.rotate();
        }
    }
}
