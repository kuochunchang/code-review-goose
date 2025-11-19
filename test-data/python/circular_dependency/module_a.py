from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .module_b import ClassB

class ClassA:
    def __init__(self, name: str):
        self.name = name
        self.b: 'ClassB' = None

    def set_b(self, b: 'ClassB'):
        self.b = b

    def call_b(self):
        if self.b:
            return self.b.method_b()
        return "No B set"
