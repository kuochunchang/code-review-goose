class Engine:
    def start(self):
        print("Engine started")

class Wheel:
    def rotate(self):
        print("Wheel rotating")

class Car:
    def __init__(self):
        self.engine = Engine()
        self.wheels = [Wheel() for _ in range(4)]

    def drive(self):
        self.engine.start()
        for wheel in self.wheels:
            wheel.rotate()
