package com.example;

/**
 * Cat class implementing IAnimal interface
 */
public class Cat extends Animal implements IAnimal {
    private String color;
    
    public Cat(String name, int age, String color) {
        super(name, age);
        this.color = color;
    }
    
    @Override
    public String speak() {
        return "Meow";
    }
    
    public String getColor() {
        return color;
    }
}
