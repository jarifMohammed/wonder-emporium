export interface CreateOrderData {
  buyerId: string;
  stripeSessionId: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  items: {
    bookId: string;
    formatId: string;
    authorId: string;
    unitPrice: number;
    quantity: number;
    taxAmount: number;
    totalPrice: number;
  }[];
}

export interface IOrderRepository {
  createOrder(data: CreateOrderData): Promise<any>;
  getOrderById(orderId: string): Promise<any>;
  updateOrderStatus(
    orderId: string,
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED',
  ): Promise<void>;
  getOrderBySessionId(sessionId: string): Promise<any>;
  getOrderByPaymentIntentId(paymentIntentId: string): Promise<any>;
}

export const ORDER_REPOSITORY_TOKEN = Symbol('IOrderRepository');
