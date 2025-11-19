package com.example.circular;

public class ClassB {
    private ClassA a;

    public void setA(ClassA a) {
        this.a = a;
    }

    public void performAction() {
        if (a != null) {
            System.out.println("Action performed by " + a.getName());
        }
    }
}
