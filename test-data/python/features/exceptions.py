class AppError(Exception):
    pass

class ValidationError(AppError):
    def __init__(self, field: str):
        self.field = field
        super().__init__(f"Invalid value for {field}")

class DatabaseError(AppError):
    pass
