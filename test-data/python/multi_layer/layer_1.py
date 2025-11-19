from .layer_2 import Service

class Controller:
    def __init__(self):
        self.service = Service("svc-1")

    def handle_request(self, input_val: int):
        result = self.service.process(input_val)
        print(f"Result: {result}")
