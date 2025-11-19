class Outer:
    def __init__(self):
        self.inner = self.Inner()

    class Inner:
        def display(self):
            print("Inner class method")
