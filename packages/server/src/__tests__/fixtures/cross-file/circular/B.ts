// Circular dependency: B depends on A

import type { A } from './A';

export class B {
  private value: number;
  private aInstance?: A;

  constructor(value: number) {
    this.value = value;
  }

  setA(a: A): void {
    this.aInstance = a;
  }

  getValue(): number {
    return this.value;
  }
}
