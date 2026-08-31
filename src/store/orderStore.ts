import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types/chat";

export interface OrderItem { product: Product; quantity: number; }
export interface OrderRecord { id: string; razorpayOrderId: string; paymentId: string; createdAt: number; amount: number; items: OrderItem[]; status: "paid"; }
interface OrderState { orders: OrderRecord[]; addOrder: (order: OrderRecord) => void; }
export const useOrderStore = create<OrderState>()(persist((set) => ({ orders: [], addOrder: (order) => set((state) => ({ orders: [order, ...state.orders.filter((x) => x.id !== order.id)] })) }), { name: "shopping-agent-orders" }));
