// Level 2: Depends on Level3

import { Level3 } from './Level3';

export class Level2 {
  private level3: Level3;

  constructor() {
    this.level3 = new Level3('initial data');
  }

  processData(): string {
    return `Level2 -> ${this.level3.process()}`;
  }
}
