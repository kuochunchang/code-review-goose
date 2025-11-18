"""
Animal base class for testing Python parser
"""


class Animal:
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

