import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { AccessoryDetail } from "../accessory-detail";
import type { SkuProduct } from "@/lib/supabase/platform-types";

// AccessoryDetail renders AddToCartButton/CrossSellCard, which call
// useCart() — stub it so the component tree doesn't need a real
// CartProvider for these render-only assertions.
const cart = vi.hoisted(() => ({addSku:vi.fn(),openCart:vi.fn()}));
beforeEach(() => vi.clearAllMocks());
vi.mock("@/components/cart/cart-context", () => ({
  useCart: () => cart,
}));

// jsdom has no IntersectionObserver — StickyMobileCta observes the CTA
// block to toggle the mobile sticky bar. Stub it so rendering doesn't throw.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IntersectionObserver = MockIntersectionObserver;

function makeProduct(overrides: Partial<SkuProduct> = {}): SkuProduct {
  return {
    id: "1",
    title: 'Apple Smart Folio iPad Air 11" Denim',
    description:
      'Apple Smart Folio i Denim beskytter forsiden af din iPad Air 11" og folder om, så den kan bruges som stander.',
    ean: null,
    product_number: null,
    cost_price: null,
    selling_price: 39900,
    sale_price: null,
    brand: "Apple",
    category: "accessory",
    subcategory: "cover",
    supplier_id: null,
    images: [],
    is_active: true,
    short_description: null,
    meta_title: null,
    meta_description: null,
    slug: "apple-smart-folio-ipad-air-11-denim",
    variants: [],
    barcode: null,
    status: "published",
    always_in_stock: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("AccessoryDetail", () => {
  // Regression test for the same leather-iPad-case bug class fixed in
  // ProductDetails variant="accessory": a SKU product whose title contains
  // "iPad Air 11" must never render device-only claims. AccessoryDetail's
  // trust strip used to hardcode "36 måneders garanti" regardless of the
  // fact that sku_products are accessories, not graded refurbished devices.
  const product = makeProduct();

  it('never claims the 36-month device warranty ("36 måneder")', () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/36 måneder/i)).not.toBeInTheDocument();
  });

  it("never mentions a cosmetic grade", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/grade|stand\s+[A-CNP]\b/i)).not.toBeInTheDocument();
  });

  it("never mentions battery", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/batteri/i)).not.toBeInTheDocument();
  });

  it("never claims a quality test count", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.queryByText(/kvalitetstest/i)).not.toBeInTheDocument();
  });

  it("shows the statutory 2-year reklamationsret instead", () => {
    render(<AccessoryDetail product={product} />);
    expect(screen.getByText(/2 års reklamationsret/i)).toBeInTheDocument();
  });

  // Regression test: sku_products.attributes keys that aren't in
  // ATTRIBUTE_LABELS fall through to `key.replace(/_/g, " ")`, which renders
  // raw English/snake_case in a Danish spec table (e.g. "watt", "charger
  // type"). watt and charger_type are live on published charger SKUs.
  describe("Danish attribute labels", () => {
    it('labels the "watt" attribute key as "Watt", not the raw key', () => {
      const charger = makeProduct({
        subcategory: "charger",
        attributes: { charger_type: "Vægoplader", watt: "20" },
      });
      render(<AccessoryDetail product={charger} />);
      expect(screen.queryByText("watt")).not.toBeInTheDocument();
      expect(screen.getAllByText("Watt").length).toBeGreaterThan(0);
    });

    it('labels the "charger_type" attribute key as "Type", not "charger type"', () => {
      const charger = makeProduct({
        subcategory: "charger",
        attributes: { charger_type: "Vægoplader", watt: "20" },
      });
      render(<AccessoryDetail product={charger} />);
      expect(screen.queryByText(/charger type/i)).not.toBeInTheDocument();
    });
  });
});

describe('accessory purchase boundary',()=>{
 it.each([0,null])('disables both purchase actions for stock %s without orderability', stock => {
  render(<AccessoryDetail product={makeProduct()} stockQuantity={stock}/>);
  const buttons=screen.getAllByRole('button',{name:stock===0?'Udsolgt':'Lagerstatus ukendt'});
  expect(buttons).toHaveLength(2); buttons.forEach(button=>{expect(button).toBeDisabled();fireEvent.click(button);});
  expect(cart.addSku).not.toHaveBeenCalled();
 });
 it('allows explicit orderability without claiming physical stock',()=>{
  render(<AccessoryDetail product={makeProduct({always_in_stock:true})} stockQuantity={null}/>);
  expect(screen.queryByText(/^På lager$/)).not.toBeInTheDocument();
  expect(screen.getAllByText('Kan bestilles').length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole('button',{name:'Tilføj til kurv'})[0]);
  expect(cart.addSku).toHaveBeenCalledWith(expect.objectContaining({skuProductId:'1',price:39900,quantity:1}));
 });
 it('selects a keyboard-operable image variant and preserves its actual price/image/cart label',()=>{
  const product=makeProduct({images:['/base.png'],variants:[{name:'Farve',options:[{value:'Sort',price_override:42900,image:'/black.png',sku:'black'}]}]});
  render(<AccessoryDetail product={product} stockQuantity={4}/>);
  const option=screen.getByRole('button',{name:'Sort'}); option.focus(); fireEvent.click(option);
  expect(option).toHaveAttribute('aria-pressed','true');
  fireEvent.click(screen.getAllByRole('button',{name:'Tilføj til kurv'})[1]);
  expect(cart.addSku).toHaveBeenCalledWith({type:'sku_product',skuProductId:'1',title:product.title,price:42900,image:'/black.png',quantity:1,variantLabel:'Farve: Sort'});
 });
});

it('keeps one product title before the gallery for reading order',()=>{
 const product=makeProduct();render(<AccessoryDetail product={product}/>);
 expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);
 expect(screen.getByRole('heading',{level:1})).toHaveTextContent(product.title);
});
