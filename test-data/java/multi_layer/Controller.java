package com.example.multilayer;

public class Controller {
    private Service service;

    public Controller() {
        this.service = new Service();
    }

    public void handleRequest(String id) {
        System.out.println(service.processData(id));
    }
}
