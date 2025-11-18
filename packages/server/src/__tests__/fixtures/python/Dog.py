"""
Dog class for testing Python parser with inheritance
"""

from Animal import Animal


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

