// Test class using TypedClass to create dependencies

import { TypedClass } from './TypedClass';

export class ComplexTypes {
  private data: TypedClass;
  private items: TypedClass[];
  private config: any;

  constructor() {
    this.data = new TypedClass(1, 'test', true);
    this.items = [];
    this.config = {};
  }

  // Method with TypedClass dependency
  processData(item: TypedClass): boolean {
    this.items.push(item);
    return item.checkStatus();
  }

  // Method returning TypedClass
  getData(): TypedClass {
    return this.data;
  }

  // Method with array return type
  getAllItems(): TypedClass[] {
    return this.items;
  }

  // Method with any parameter and boolean return
  validateConfig(config: any): boolean {
    this.config = config;
    return config !== null && config !== undefined;
  }
}
