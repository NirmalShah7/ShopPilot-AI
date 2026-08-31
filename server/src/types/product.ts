export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  specs: Record<string, string>;
  tags: string[];
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  review_count: number;
  image_url: string;
  description: string;
  specs_json: string;
  tags_json: string;
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    price: row.price,
    mrp: row.mrp,
    rating: row.rating,
    reviewCount: row.review_count,
    imageUrl: row.image_url,
    description: row.description,
    specs: JSON.parse(row.specs_json),
    tags: JSON.parse(row.tags_json),
  };
}
