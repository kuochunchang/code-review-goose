package com.example.patterns;

public class Singleton {
    private static Singleton instance;
    public String value;

    private Singleton() {
        this.value = "I am the only one";
    }

    public static Singleton getInstance() {
        if (instance == null) {
            instance = new Singleton();
        }
        return instance;
    }
}
