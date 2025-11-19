class BaseEntity:
    def __init__(self, id: str):
        self.id = id

    def to_dict(self):
        return {"id": self.id}

def common_util(x: int) -> int:
    return x * 2
