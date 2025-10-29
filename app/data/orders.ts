import type { Order } from '../types';

// This acts as a simple in-memory database for the session.
// In a real application, this would be a persistent database.
const orders: Order[] = [];

export const addOrder = (order: Order): void => {
  orders.push(order);
  console.log('Order added:', order);
  console.log('All orders:', orders);
};

export const getOrders = (): Order[] => {
  return [...orders];
};