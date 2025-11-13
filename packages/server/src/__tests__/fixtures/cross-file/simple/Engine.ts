// Simple Engine class with no dependencies

export class Engine {
  private horsePower: number;

  constructor(horsePower: number) {
    this.horsePower = horsePower;
  }

  start(): void {
    console.log('Engine started');
  }

  stop(): void {
    console.log('Engine stopped');
  }

  getHorsePower(): number {
    return this.horsePower;
  }
}
