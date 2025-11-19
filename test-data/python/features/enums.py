from enum import Enum, auto

class Status(Enum):
    PENDING = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()

class Task:
    def __init__(self, name: str):
        self.name = name
        self.status = Status.PENDING
