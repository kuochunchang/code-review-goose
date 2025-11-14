// Layer 1: Database Model - Order

export enum OrderStatus {
  Pending = 'PENDING',
  Confirmed = 'CONFIRMED',
  Shipped = 'SHIPPED',
  Delivered = 'DELIVERED',
  Cancelled = 'CANCELLED',
}

export interface OrderItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface OrderAttributes {
  id: number;
  customerId: number;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
}

export class Order {
  private id: number;
  private customerId: number;
  private items: OrderItem[];
  private totalAmount: number;
  private status: OrderStatus;
  private createdAt: Date;

  constructor(attributes: OrderAttributes) {
    this.id = attributes.id;
    this.customerId = attributes.customerId;
    this.items = attributes.items;
    this.totalAmount = attributes.totalAmount;
    this.status = attributes.status;
    this.createdAt = attributes.createdAt;
  }

  getId(): number {
    return this.id;
  }

  getCustomerId(): number {
    return this.customerId;
  }

  getItems(): OrderItem[] {
    return this.items;
  }

  getTotalAmount(): number {
    return this.totalAmount;
  }

  getStatus(): OrderStatus {
    return this.status;
  }

  updateStatus(newStatus: OrderStatus): void {
    this.status = newStatus;
  }

  addItem(item: OrderItem): void {
    this.items.push(item);
    this.totalAmount += item.price * item.quantity;
  }

  removeItem(productId: number): void {
    const index = this.items.findIndex((item) => item.productId === productId);
    if (index !== -1) {
      const item = this.items[index];
      this.totalAmount -= item.price * item.quantity;
      this.items.splice(index, 1);
    }
  }

  calculateTotalItems(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  isPending(): boolean {
    return this.status === OrderStatus.Pending;
  }

  isDelivered(): boolean {
    return this.status === OrderStatus.Delivered;
  }
}
