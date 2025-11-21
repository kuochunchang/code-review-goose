package com.example.testdata;

import java.util.ArrayList;
import java.util.List;

interface Vehicle {
    void start();
    void stop();
    String getMake();
}

abstract class AbstractVehicle implements Vehicle {
    public String make;
    public String model;
    public int year;

    public AbstractVehicle(String make, String model, int year) {
        this.make = make;
        this.model = model;
        this.year = year;
    }

    @Override
    public String getMake() {
        return make;
    }

    public abstract int getNumberOfWheels();
}

class Car extends AbstractVehicle {
    private int numberOfDoors;

    public Car(String make, String model, int year, int numberOfDoors) {
        super(make, model, year);
        this.numberOfDoors = numberOfDoors;
    }

    @Override
    public void start() {
        System.out.println("Car starting...");
    }

    @Override
    public void stop() {
        System.out.println("Car stopping...");
    }

    @Override
    public int getNumberOfWheels() {
        return 4;
    }

    public void honk() {
        System.out.println("Beep beep!");
    }
}

class Motorcycle extends AbstractVehicle {
    private boolean hasSidecar;

    public Motorcycle(String make, String model, int year, boolean hasSidecar) {
        super(make, model, year);
        this.hasSidecar = hasSidecar;
    }

    @Override
    public void start() {
        System.out.println("Motorcycle starting...");
    }

    @Override
    public void stop() {
        System.out.println("Motorcycle stopping...");
    }

    @Override
    public int getNumberOfWheels() {
        return hasSidecar ? 3 : 2;
    }
}

public class Garage {
    private List<Vehicle> vehicles;

    public Garage() {
        this.vehicles = new ArrayList<>();
    }

    public void park(Vehicle vehicle) {
        this.vehicles.add(vehicle);
        System.out.println("Parked " + vehicle.getMake());
    }

    public void startAll() {
        for (Vehicle v : vehicles) {
            v.start();
        }
    }
}
