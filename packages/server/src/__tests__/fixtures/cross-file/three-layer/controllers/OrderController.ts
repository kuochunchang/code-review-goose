// Layer 3: API Controller - OrderController
// Depends on: OrderService, ProductService (Layer 2)
// Indirectly depends on: Product, Customer, Order (Layer 1)

import { OrderService, CreateOrderRequest } from '../services/OrderService';
import { ProductService } from '../services/ProductService';
import { Customer } from '../models/Customer';
import { OrderStatus } from '../models/Order';

export interface CreateOrderResponse {
  success: boolean;
  orderId?: number;
  message: string;
  totalAmount?: number;
}

export interface OrderStatusResponse {
  orderId: number;
  status: string;
  totalAmount: number;
  itemCount: number;
}

export class OrderController {
  private orderService: OrderService;
  private productService: ProductService;

  constructor(orderService: OrderService, productService: ProductService) {
    this.orderService = orderService;
    this.productService = productService;
  }

  // Handle create order request
  handleCreateOrder(request: CreateOrderRequest, customer: Customer): CreateOrderResponse {
    try {
      // Fetch products from product service
      const products = request.items.map((item) => {
        const product = this.productService.getProduct(item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        return product;
      });

      // Create order via order service
      const order = this.orderService.createOrder(request, customer, products);

      // Update product stock
      for (const item of request.items) {
        const product = this.productService.getProduct(item.productId);
        if (product) {
          const newStock = product.getStock() - item.quantity;
          this.productService.updateStock(item.productId, newStock);
        }
      }

      return {
        success: true,
        orderId: order.getId(),
        message: 'Order created successfully',
        totalAmount: order.getTotalAmount(),
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  // Handle get order status request
  handleGetOrderStatus(orderId: number): OrderStatusResponse | null {
    const order = this.orderService.getOrder(orderId);

    if (!order) {
      return null;
    }

    return {
      orderId: order.getId(),
      status: order.getStatus(),
      totalAmount: order.getTotalAmount(),
      itemCount: order.calculateTotalItems(),
    };
  }

  // Handle update order status request
  handleUpdateOrderStatus(orderId: number, newStatus: OrderStatus): CreateOrderResponse {
    try {
      this.orderService.updateOrderStatus(orderId, newStatus);

      return {
        success: true,
        message: `Order ${orderId} status updated to ${newStatus}`,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  // Handle get customer orders request
  handleGetCustomerOrders(customer: Customer): OrderStatusResponse[] {
    const orders = this.orderService.getCustomerOrders(customer);

    return orders.map((order) => ({
      orderId: order.getId(),
      status: order.getStatus(),
      totalAmount: order.getTotalAmount(),
      itemCount: order.calculateTotalItems(),
    }));
  }

  // Handle get dashboard statistics
  handleGetDashboardStats(): {
    totalRevenue: number;
    pendingOrders: number;
    inventoryValue: number;
    lowStockCount: number;
  } {
    return {
      totalRevenue: this.orderService.calculateRevenue(),
      pendingOrders: this.orderService.getPendingOrdersCount(),
      inventoryValue: this.productService.calculateInventoryValue(),
      lowStockCount: this.productService.getLowStockProducts().length,
    };
  }
}
