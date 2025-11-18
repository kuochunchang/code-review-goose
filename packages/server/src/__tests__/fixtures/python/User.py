"""
User class for testing Python parser with type hints
"""

from typing import List, Dict, Optional


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
    
    def get_age(self) -> int:
        """Get user age"""
        return self.age
    
    def process_data(self, items: List[str], config: Dict[str, int]) -> Dict[str, int]:
        """Process data with type hints"""
        return {}

