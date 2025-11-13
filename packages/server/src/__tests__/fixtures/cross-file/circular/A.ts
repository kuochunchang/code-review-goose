// Circular dependency: A depends on B

import type { B } from './B';

export class A {
  private name: string;
  private bInstance?: B;

  constructor(name: string) {
    this.name = name;
  }

  setB(b: B): void {
    this.bInstance = b;
  }

  getName(): string {
    return this.name;
  }
}
