from typing import List, Optional

class Animal:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

    def speak(self) -> str:
        return "..."

    def get_info(self) -> str:
        return f"{self.name} is {self.age} years old"

class Dog(Animal):
    def __init__(self, name: str, age: int, breed: str):
        super().__init__(name, age)
        self.breed = breed

    def speak(self) -> str:
        return "Woof!"

    def fetch(self, item: str) -> str:
        return f"{self.name} fetched {item}"

class Cat(Animal):
    def speak(self) -> str:
        return "Meow!"

def feed_animals(animals: List[Animal]) -> None:
    for animal in animals:
        print(f"Feeding {animal.name}")
        print(animal.speak())

if __name__ == "__main__":
    dog = Dog("Buddy", 3, "Golden Retriever")
    cat = Cat("Whiskers", 2)
    
    animals = [dog, cat]
    feed_animals(animals)
