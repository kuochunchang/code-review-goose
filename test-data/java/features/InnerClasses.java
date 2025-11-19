package com.example.features;

public class InnerClasses {
    private String outerField = "Outer";

    public class Inner {
        public void display() {
            System.out.println("Inner accessing: " + outerField);
        }
    }

    public static class StaticInner {
        public void display() {
            System.out.println("Static Inner");
        }
    }
}
