// Layer 2: Business Service - OrderService
// Depends on: Product, Customer, Order (Layer 1)

import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order, OrderStatus, OrderItem } from '../models/Order';

export interface CreateOrderRequest {
  customerId: number;
  items: Array<{ productId: number; quantity: number }>;
}

export class OrderService {
  private orders: Map<number, Order>;
  private nextOrderId: number;

  constructor() {
    this.orders = new Map();
    this.nextOrderId = 1;
  }

  // Create new order with validation
  createOrder(
    request: CreateOrderRequest,
    customer: Customer,
    products: Product[]
  ): Order {
    // Validate customer is active
    if (!customer.checkIsActive()) {
      throw new Error('Customer is not active');
    }

    // Validate products and calculate total
    const orderItems: OrderItem[] = [];
    let totalAmount = 0;

    for (const item of request.items) {
      const product = products.find((p) => p.getId() === item.productId);

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (!product.isInStock()) {
        throw new Error(`Product ${product.getName()} is out of stock`);
      }

      if (product.getStock() < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.getName()}. Available: ${product.getStock()}`
        );
      }

      const itemTotal = product.calculateTotal(item.quantity);
      orderItems.push({
        productId: product.getId(),
        quantity: item.quantity,
        price: product.getPrice(),
      });

      totalAmount += itemTotal;
    }

    // Create order
    const order = new Order({
      id: this.nextOrderId++,
      customerId: customer.getId(),
      items: orderItems,
      totalAmount,
      status: OrderStatus.Pending,
      createdAt: new Date(),
    });

    this.orders.set(order.getId(), order);
    return order;
  }

  // Get order by ID
  getOrder(orderId: number): Order | undefined {
    return this.orders.get(orderId);
  }

  // Get all orders for a customer
  getCustomerOrders(customer: Customer): Order[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.getCustomerId() === customer.getId()
    );
  }

  // Update order status
  updateOrderStatus(orderId: number, newStatus: OrderStatus): void {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    order.updateStatus(newStatus);
  }

  // Calculate total revenue
  calculateRevenue(): number {
    return Array.from(this.orders.values())
      .filter((order) => order.isDelivered())
      .reduce((sum, order) => sum + order.getTotalAmount(), 0);
  }

  // Get pending orders count
  getPendingOrdersCount(): number {
    return Array.from(this.orders.values()).filter((order) => order.isPending()).length;
  }
}
