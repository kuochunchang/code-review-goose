package com.example.features;

import java.util.List;

public class Generics<T> {
    private T value;

    public Generics(T value) {
        this.value = value;
    }

    public T getValue() {
        return value;
    }

    public <U> void printList(List<U> list) {
        for (U item : list) {
            System.out.println(item);
        }
    }
}
