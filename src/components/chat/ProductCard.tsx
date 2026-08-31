import { ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/types/chat";
import { useCartStore } from "@/store/cartStore";
import { useToastStore } from "@/store/toastStore";

interface ProductCardProps {
  product: Product;
  onOpen?: (product: Product) => void;
}

export function ProductCard({ product, onOpen }: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const cartQuantity = useCartStore((state) => state.items.find((item) => item.product.id === product.id)?.quantity ?? 0);
  const showToast = useToastStore((state) => state.show);
  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-2xl border border-[#e7e4dc] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(30,30,20,0.09)]"
      onClick={() => onOpen?.(product)}
    >
      <div className="flex h-[170px] items-center justify-center bg-[#faf9f5] p-5">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-[78%] object-contain mix-blend-multiply transition duration-200 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>
      <div className="flex min-h-[185px] flex-col p-3.5">
        <p className="text-[10px] font-medium text-[#8a887f]">{product.brand}</p>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-[#272620] line-clamp-2">{product.name}</p>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#6e6c63]">
          <Star className="h-3.5 w-3.5 fill-[#687000] text-[#687000]" />
          <span className="font-semibold">{product.rating.toFixed(1)}</span>
          <span>({product.reviewCount.toLocaleString("en-IN")})</span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
          <span className="text-[15px] font-bold text-[#20201c]">₹{product.price.toLocaleString("en-IN")}</span>
          {product.mrp > product.price && <span className="text-[10px] text-[#9b988e] line-through">₹{product.mrp.toLocaleString("en-IN")}</span>}
          {discount > 0 && <span className="text-[10px] font-semibold text-[#4f7839]">{discount}% off</span>}
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation();
            addToCart(product);
            showToast(`${product.name} added to cart`);
          }}
          className="mt-auto flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[#687000] bg-white text-[10px] font-semibold text-[#687000] transition hover:bg-[#687000] hover:text-white"
        >
          <ShoppingCart className="h-3.5 w-3.5" /> {cartQuantity > 0 ? `In cart • ${cartQuantity}` : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
