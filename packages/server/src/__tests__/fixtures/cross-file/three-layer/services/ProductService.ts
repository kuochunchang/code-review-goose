// Layer 2: Business Service - ProductService
// Depends on: Product (Layer 1)

import { Product, ProductAttributes } from '../models/Product';

export interface ProductSearchCriteria {
  minPrice?: number;
  maxPrice?: number;
  categoryId?: number;
  inStockOnly?: boolean;
}

export class ProductService {
  private products: Map<number, Product>;
  private nextProductId: number;

  constructor() {
    this.products = new Map();
    this.nextProductId = 1;
  }

  // Add new product
  addProduct(attributes: Omit<ProductAttributes, 'id'>): Product {
    const product = new Product({
      id: this.nextProductId++,
      ...attributes,
    });

    this.products.set(product.getId(), product);
    return product;
  }

  // Get product by ID
  getProduct(productId: number): Product | undefined {
    return this.products.get(productId);
  }

  // Get all products
  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  // Search products by criteria
  searchProducts(criteria: ProductSearchCriteria): Product[] {
    let results = Array.from(this.products.values());

    if (criteria.minPrice !== undefined) {
      results = results.filter((p) => p.getPrice() >= criteria.minPrice!);
    }

    if (criteria.maxPrice !== undefined) {
      results = results.filter((p) => p.getPrice() <= criteria.maxPrice!);
    }

    if (criteria.categoryId !== undefined) {
      results = results.filter((p) => p.getCategoryId() === criteria.categoryId);
    }

    if (criteria.inStockOnly) {
      results = results.filter((p) => p.isInStock());
    }

    return results;
  }

  // Update product stock
  updateStock(productId: number, quantity: number): void {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    product.updateStock(quantity);
  }

  // Get low stock products
  getLowStockProducts(threshold: number = 10): Product[] {
    return Array.from(this.products.values()).filter(
      (p) => p.getStock() > 0 && p.getStock() <= threshold
    );
  }

  // Get out of stock products
  getOutOfStockProducts(): Product[] {
    return Array.from(this.products.values()).filter((p) => !p.isInStock());
  }

  // Calculate total inventory value
  calculateInventoryValue(): number {
    return Array.from(this.products.values()).reduce(
      (sum, product) => sum + product.getPrice() * product.getStock(),
      0
    );
  }
}
