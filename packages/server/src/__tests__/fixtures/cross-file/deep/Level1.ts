// Level 1: Top layer depends on Level2

import { Level2 } from './Level2';

export class Level1 {
  private level2: Level2;

  constructor() {
    this.level2 = new Level2();
  }

  execute(): string {
    return `Level1 -> ${this.level2.processData()}`;
  }
}
