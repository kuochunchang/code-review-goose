package com.example;

import java.util.List;
import java.util.Map;

/**
 * User class for testing Java parser with generics
 */
public class User {
    private String name;
    private int age;
    private List<String> tags;
    
    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public String getName() {
        return name;
    }
    
    public int getAge() {
        return age;
    }
    
    public void setTags(List<String> tags) {
        this.tags = tags;
    }
    
    public Map<String, Integer> processData(List<String> items) {
        return null;
    }
}
