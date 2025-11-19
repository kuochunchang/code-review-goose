from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .module_a import ClassA

class ClassB:
    def __init__(self, value: int):
        self.value = value
        self.a: 'ClassA' = None

    def set_a(self, a: 'ClassA'):
        self.a = a

    def method_b(self) -> str:
        return f"ClassB value: {self.value}"

    def call_a(self):
        if self.a:
            return f"Calling A: {self.a.name}"
        return "No A set"
