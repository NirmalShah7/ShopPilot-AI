declare module "razorpay" {
  interface OrderOptions { amount: number; currency: string; receipt?: string; notes?: Record<string, string>; }
  interface Order { id: string; amount: number; currency: string; }
  interface Orders { create(options: OrderOptions): Promise<Order>; }
  interface RazorpayOptions { key_id: string; key_secret: string; }
  class Razorpay { constructor(options: RazorpayOptions); orders: Orders; }
  export default Razorpay;
}
