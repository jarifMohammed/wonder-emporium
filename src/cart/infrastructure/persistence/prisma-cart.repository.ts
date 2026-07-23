import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/services/prisma.service';
import {
  ICartRepository,
  Cart,
} from '../../domain/interfaces/cart.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class PrismaCartRepository implements ICartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    let cart = await this.findByUserId(userId);
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }
    return this.toDomain(cart);
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    return cart ? this.toDomain(cart) : null;
  }

  async addItem(userId: string, bookId: string, formatId: string, quantity: number = 1): Promise<Cart> {
    const cart = await this.findOrCreateByUserId(userId);

    // Check if book and format exist
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw AppError.notFound('Book not found');

    const format = await this.prisma.bookFormatPricing.findUnique({ where: { id: formatId } });
    if (!format) throw AppError.notFound('Format not found');

    // Check if item already exists in cart
    const existingItem = cart.items.find(
      (item) => item.bookId === bookId && item.formatId === formatId
    );

    if (existingItem) {
      // Update quantity
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      // Add new item
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          bookId,
          formatId,
          quantity,
        },
      });
    }

    // Return updated cart
    const updatedCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    return this.toDomain(updatedCart!);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number): Promise<Cart> {
    const cart = await this.findByUserId(userId);
    if (!cart) throw AppError.notFound('Cart not found');

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw AppError.notFound('Cart item not found');

    if (quantity <= 0) {
      return this.removeItem(userId, itemId);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    const updatedCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    return this.toDomain(updatedCart!);
  }

  async removeItem(userId: string, itemId: string): Promise<Cart> {
    const cart = await this.findByUserId(userId);
    if (!cart) throw AppError.notFound('Cart not found');

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    const updatedCart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
    return this.toDomain(updatedCart!);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.findByUserId(userId);
    if (!cart) return;

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  private toDomain(cart: any): Cart {
    return {
      id: cart.id,
      userId: cart.userId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items: cart.items.map((item: any) => ({
        id: item.id,
        cartId: item.cartId,
        bookId: item.bookId,
        formatId: item.formatId,
        quantity: item.quantity,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  }
}
