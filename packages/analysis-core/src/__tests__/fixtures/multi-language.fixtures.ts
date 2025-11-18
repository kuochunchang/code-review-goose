/**
 * Multi-language test fixtures for analysis-core
 * Python and Java code samples for testing
 */

export const pythonAnimalCode = `class Animal:
    """Base class for all animals"""
    
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def speak(self) -> str:
        """Make the animal speak"""
        return "Some generic animal sound"
    
    def get_name(self) -> str:
        """Get the animal's name"""
        return self.name
`;

export const pythonDogCode = `from Animal import Animal

class Dog(Animal):
    """Dog class that inherits from Animal"""
    
    def __init__(self, name: str, age: int, breed: str):
        super().__init__(name, age)
        self.breed = breed
    
    def speak(self) -> str:
        """Override speak method"""
        return "Woof!"
    
    def fetch(self) -> str:
        """Dog-specific method"""
        return f"{self.name} is fetching!"
`;

export const pythonUserCode = `from typing import List, Dict

class User:
    """User class with type hints"""
    
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age
    
    def process_data(self, items: List[str], config: Dict[str, int]) -> Dict[str, int]:
        """Process data with type hints"""
        result: Dict[str, int] = {}
        for item in items:
            result[item] = config.get(item, 0)
        return result
`;

export const javaAnimalCode = `public class Animal {
    private String name;
    private int age;
    
    public Animal(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public String speak() {
        return "Some generic animal sound";
    }
    
    public String getName() {
        return name;
    }
    
    public int getAge() {
        return age;
    }
}
`;

export const javaDogCode = `public class Dog extends Animal {
    private String breed;
    
    public Dog(String name, int age, String breed) {
        super(name, age);
        this.breed = breed;
    }
    
    @Override
    public String speak() {
        return "Woof!";
    }
    
    public String fetch() {
        return getName() + " is fetching!";
    }
}
`;

export const javaIAnimalCode = `public interface IAnimal {
    String getName();
    int getAge();
    String speak();
}
`;

export const javaCatCode = `public class Cat extends Animal implements IAnimal {
    private String color;
    
    public Cat(String name, int age, String color) {
        super(name, age);
        this.color = color;
    }
    
    @Override
    public String speak() {
        return "Meow!";
    }
    
    public String getColor() {
        return color;
    }
}
`;

export const javaUserCode = `import java.util.List;
import java.util.Map;

public class User {
    private String name;
    private int age;
    private List<String> tags;
    
    public User(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public Map<String, Integer> processData(List<String> items) {
        Map<String, Integer> result = new HashMap<>();
        for (String item : items) {
            result.put(item, 0);
        }
        return result;
    }
}
`;
