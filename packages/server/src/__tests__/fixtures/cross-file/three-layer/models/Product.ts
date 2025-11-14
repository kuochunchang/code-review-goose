// Layer 1: Database Model - Product

export interface ProductAttributes {
  id: number;
  name: string;
  price: number;
  stock: number;
  categoryId: number;
  createdAt: Date;
}

export class Product {
  private id: number;
  private name: string;
  private price: number;
  private stock: number;
  private categoryId: number;
  private createdAt: Date;

  constructor(attributes: ProductAttributes) {
    this.id = attributes.id;
    this.name = attributes.name;
    this.price = attributes.price;
    this.stock = attributes.stock;
    this.categoryId = attributes.categoryId;
    this.createdAt = attributes.createdAt;
  }

  getId(): number {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getPrice(): number {
    return this.price;
  }

  getStock(): number {
    return this.stock;
  }

  getCategoryId(): number {
    return this.categoryId;
  }

  isInStock(): boolean {
    return this.stock > 0;
  }

  updateStock(quantity: number): void {
    this.stock = quantity;
  }

  calculateTotal(quantity: number): number {
    return this.price * quantity;
  }
}
