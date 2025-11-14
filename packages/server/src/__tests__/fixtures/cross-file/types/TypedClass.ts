// Test class with various TypeScript type annotations including boolean and any

export class TypedClass {
  private id: number;
  private name: string;
  private isActive: boolean; // Test boolean type
  private metadata: any; // Test any type
  public tags: string[];

  constructor(id: number, name: string, isActive: boolean) {
    this.id = id;
    this.name = name;
    this.isActive = isActive;
    this.metadata = {};
    this.tags = [];
  }

  // Method with boolean return type
  checkStatus(): boolean {
    return this.isActive;
  }

  // Method with boolean parameter
  setActive(status: boolean): void {
    this.isActive = status;
  }

  // Method with any return type
  getMetadata(): any {
    return this.metadata;
  }

  // Method with any parameter
  setMetadata(data: any): void {
    this.metadata = data;
  }

  // Method with void return type
  clearTags(): void {
    this.tags = [];
  }
}
