package com.example.patterns;

interface Animal {
    String speak();
}

class Dog implements Animal {
    public String speak() {
        return "Woof";
    }
}

class Cat implements Animal {
    public String speak() {
        return "Meow";
    }
}

public class Factory {
    public static Animal createAnimal(String type) {
        if (type.equalsIgnoreCase("dog")) {
            return new Dog();
        } else if (type.equalsIgnoreCase("cat")) {
            return new Cat();
        }
        throw new IllegalArgumentException("Unknown animal type");
    }
}
