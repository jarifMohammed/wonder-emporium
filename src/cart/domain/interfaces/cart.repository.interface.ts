export interface CartItem {
  id: string;
  cartId: string;
  bookId: string;
  formatId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cart {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  items: CartItem[];
}

export interface ICartRepository {
  findOrCreateByUserId(userId: string): Promise<Cart>;
  findByUserId(userId: string): Promise<Cart | null>;
  addItem(userId: string, bookId: string, formatId: string, quantity?: number): Promise<Cart>;
  updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<Cart>;
  removeItem(userId: string, itemId: string): Promise<Cart>;
  clearCart(userId: string): Promise<void>;
}

export const CART_REPOSITORY_TOKEN = Symbol('ICartRepository');
