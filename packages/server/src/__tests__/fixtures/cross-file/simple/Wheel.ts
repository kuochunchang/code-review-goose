// Simple Wheel class with no dependencies

export class Wheel {
  private diameter: number;

  constructor(diameter: number) {
    this.diameter = diameter;
  }

  getDiameter(): number {
    return this.diameter;
  }

  rotate(): void {
    console.log('Wheel rotating');
  }
}
