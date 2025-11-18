/**
 * 基础文件信息
 */
export const mockFileInfo = {
  size: 1024,
  isLargeFile: false,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: false,
  name: 'test.ts',
};

/**
 * 大文件信息
 */
export const mockLargeFileInfo = {
  size: 10485760, // 10MB
  isLargeFile: true,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: false,
  name: 'large-file.ts',
};

/**
 * 小文件信息
 */
export const mockSmallFileInfo = {
  size: 256,
  isLargeFile: false,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: false,
  name: 'small.ts',
};

/**
 * 目录信息
 */
export const mockDirectoryInfo = {
  size: 0,
  isLargeFile: false,
  mtime: new Date('2024-01-01T00:00:00.000Z'),
  isDirectory: true,
  name: 'src',
};

/**
 * 基础文件内容 - TypeScript测试代码
 */
export const mockFileContent = `import { describe, it, expect } from 'vitest';

describe('Test Suite', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});`;

/**
 * Vue组件内容
 */
export const mockVueFileContent = `<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="handleClick">Click me</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const title = ref('Hello World');

const handleClick = () => {
  console.log('Button clicked');
};
</script>

<style scoped>
.container {
  padding: 20px;
}
</style>`;

/**
 * JavaScript文件内容
 */
export const mockJsFileContent = `export function calculateSum(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

export default {
  calculateSum,
  multiply,
};`;

/**
 * 文件块（用于大文件分块读取）
 */
export const mockFileChunk = {
  content: 'chunk content line 1\nchunk content line 2\nchunk content line 3',
  offset: 1024,
  totalSize: 10240,
  hasMore: true,
  isLargeFile: true,
};

/**
 * 第一块文件内容
 */
export const mockFirstChunk = {
  content: 'First chunk of the file...',
  offset: 0,
  totalSize: 5120,
  hasMore: true,
  isLargeFile: true,
};

/**
 * 最后一块文件内容
 */
export const mockLastChunk = {
  content: 'Last chunk of the file...',
  offset: 4096,
  totalSize: 5120,
  hasMore: false,
  isLargeFile: true,
};

/**
 * 完整文件（非大文件）
 */
export const mockCompleteFile = {
  content: mockFileContent,
  offset: 0,
  totalSize: mockFileContent.length,
  hasMore: false,
  isLargeFile: false,
};

/**
 * Python 文件内容 - Animal 类
 */
export const mockPythonAnimalContent = `class Animal:
    """Base class for all animals"""
    
    def __init__(self, name: str, age: int):
        """Initialize animal with name and age"""
        self.name = name
        self.age = age
    
    def speak(self) -> str:
        """Make a sound"""
        return "Some sound"
    
    def get_name(self) -> str:
        """Get animal name"""
        return self.name
`;

/**
 * Python 文件内容 - Dog 类（继承）
 */
export const mockPythonDogContent = `from Animal import Animal


class Dog(Animal):
    """Dog class that extends Animal"""
    
    def __init__(self, name: str, age: int, breed: str):
        """Initialize dog with name, age, and breed"""
        super().__init__(name, age)
        self.breed = breed
    
    def speak(self) -> str:
        """Dog makes a woof sound"""
        return "Woof"
    
    def get_breed(self) -> str:
        """Get dog breed"""
        return self.breed
`;

/**
 * Python 文件内容 - User 类（类型注解）
 */
export const mockPythonUserContent = `from typing import List, Dict, Optional


class User:
    """User class with type hints"""
    
    def __init__(self, name: str, age: int, email: Optional[str] = None):
        """Initialize user"""
        self.name = name
        self.age = age
        self.email = email
    
    def get_name(self) -> str:
        """Get user name"""
        return self.name
    
    def process_data(self, items: List[str], config: Dict[str, int]) -> Dict[str, int]:
        """Process data with type hints"""
        return {}
`;

/**
 * Java 文件内容 - Animal 类
 */
export const mockJavaAnimalContent = `package com.example;

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
}
`;

/**
 * Java 文件内容 - Dog 类（继承）
 */
export const mockJavaDogContent = `package com.example;

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
`;

/**
 * Java 文件内容 - User 类（泛型）
 */
export const mockJavaUserContent = `package com.example;

import java.util.List;
import java.util.Map;

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
    
    public Map<String, Integer> processData(List<String> items) {
        return null;
    }
}
`;

/**
 * Java 文件内容 - IAnimal 接口
 */
export const mockJavaIAnimalContent = `package com.example;

public interface IAnimal {
    String getName();
    int getAge();
    String speak();
}
`;

/**
 * Java 文件内容 - Cat 类（继承 + 实现接口）
 */
export const mockJavaCatContent = `package com.example;

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
`;
