package com.example.relationships;

interface A {
    default void method() {
        System.out.println("A method");
    }
}

interface B extends A {
    @Override
    default void method() {
        System.out.println("B method");
    }
}

interface C extends A {
    @Override
    default void method() {
        System.out.println("C method");
    }
}

public class Diamond implements B, C {
    @Override
    public void method() {
        // Must resolve ambiguity
        B.super.method();
    }
}
