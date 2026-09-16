import { Suspense } from "react";
import { CreateProduct } from "@/components/admin/products/create/create-product";

export default function CreateProductPage() {
  return (
    <Suspense fallback={null}>
      <CreateProduct />
    </Suspense>
  );
}
