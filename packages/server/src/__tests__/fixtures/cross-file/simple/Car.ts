// Car class with Composition (Engine) and Aggregation (Wheel[]) relationships

import { Engine } from './Engine';
import { Wheel } from './Wheel';

export class Car {
  private engine: Engine;        // Composition: Car owns Engine
  public wheels: Wheel[];        // Aggregation: Car has Wheels
  private brand: string;

  constructor(brand: string) {
    this.brand = brand;
    this.engine = new Engine(200);
    this.wheels = [
      new Wheel(18),
      new Wheel(18),
      new Wheel(18),
      new Wheel(18),
    ];
  }

  start(): void {
    this.engine.start();
    console.log(`${this.brand} car started`);
  }

  drive(): void {
    console.log('Car is driving');
    this.wheels.forEach((wheel) => wheel.rotate());
  }

  getBrand(): string {
    return this.brand;
  }
}
