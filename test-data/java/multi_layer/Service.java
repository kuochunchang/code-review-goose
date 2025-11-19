package com.example.multilayer;

public class Service {
    private Repository repository;

    public Service() {
        this.repository = new Repository();
    }

    public String processData(String id) {
        String data = repository.getData(id);
        return data.toUpperCase();
    }
}
