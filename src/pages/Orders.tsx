import { Download, PackageCheck } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import { downloadOrderPdf } from "@/lib/pdf";

export default function Orders() {
  const orders = useOrderStore((s) => s.orders);
  return <div className="min-h-full bg-[#f7f6f2] p-5 sm:p-8">
    <div className="mx-auto max-w-[1000px]">
      <h1 className="text-2xl font-semibold text-app-text">Orders</h1>
      <p className="mt-1 text-sm text-app-text-muted">Your successful purchases and downloadable receipts.</p>
      {orders.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-[#d9d5ca] bg-white p-12 text-center"><PackageCheck className="mx-auto h-9 w-9 text-[#8a887f]" /><p className="mt-3 text-sm font-semibold">No orders yet</p><p className="mt-1 text-xs text-[#77756e]">Successful Razorpay Test Mode payments will appear here.</p></div> : <div className="mt-6 space-y-4">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-[#e7e4dc] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{order.id}</p><p className="mt-1 text-[11px] text-[#77756e]">{new Date(order.createdAt).toLocaleString("en-IN")} · {order.paymentId}</p></div><button onClick={() => downloadOrderPdf(order)} className="inline-flex items-center gap-2 rounded-lg border border-[#687000] px-3 py-2 text-[11px] font-semibold text-[#687000] hover:bg-[#f5f5eb]"><Download className="h-3.5 w-3.5" /> Download PDF</button></div><div className="mt-4 divide-y divide-[#efede7]">{order.items.map(({ product, quantity }) => <div key={product.id} className="flex gap-3 py-3"><div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#faf9f5] p-2"><img src={product.imageUrl} alt="" className="h-full w-full object-contain mix-blend-multiply" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold line-clamp-2">{product.name}</p><p className="mt-1 text-[11px] text-[#77756e]">Qty {quantity} · INR {product.price.toLocaleString("en-IN")}</p></div></div>)}</div><div className="mt-3 flex justify-between border-t border-[#efede7] pt-3 text-sm"><span className="text-[#77756e]">Paid</span><span className="font-bold">INR {order.amount.toLocaleString("en-IN")}</span></div></article>)}</div>}
    </div>
  </div>;
}
