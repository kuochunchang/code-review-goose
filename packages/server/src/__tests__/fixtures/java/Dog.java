package com.example;

/**
 * Dog class for testing Java parser with inheritance
 */
public class Dog extends Animal {
    private String breed;
    
    public Dog(String name, int age, String breed) {
        super(name, age);
        this.breed = breed;
    }
    
    @Override
    public String speak() {
        return "Woof";
    }
    
    public String getBreed() {
        return breed;
    }
}
