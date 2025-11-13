// Level 3: Bottom layer with no dependencies

export class Level3 {
  private data: string;

  constructor(data: string) {
    this.data = data;
  }

  getData(): string {
    return this.data;
  }

  process(): string {
    return `Level3 processed: ${this.data}`;
  }
}
