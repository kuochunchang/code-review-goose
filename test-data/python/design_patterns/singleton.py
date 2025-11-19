class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Singleton, cls).__new__(cls)
            cls._instance.value = "I am the only one"
        return cls._instance

    def get_value(self):
        return self.value
