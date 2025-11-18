package com.example;

/**
 * Animal base class for testing Java parser
 */
public class Animal {
    private String name;
    private int age;
    
    public Animal(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public String speak() {
        return "Some sound";
    }
    
    public String getName() {
        return name;
    }
    
    public int getAge() {
        return age;
    }
}
