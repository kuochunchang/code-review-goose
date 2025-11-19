package com.example.circular;

public class ClassA {
    private ClassB b;

    public void setB(ClassB b) {
        this.b = b;
    }

    public void doSomething() {
        if (b != null) {
            b.performAction();
        }
    }

    public String getName() {
        return "ClassA";
    }
}
