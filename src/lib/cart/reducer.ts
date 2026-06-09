import type { CartState, CartAction, CartSkuItem } from "@/lib/cart/types";
import { cartItemKey } from "@/lib/cart/types";

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_DEVICE": {
      const exists = state.items.some(
        (i) => i.type === "device" && i.deviceId === action.item.deviceId,
      );
      if (exists) return state;
      return { ...state, items: [...state.items, action.item] };
    }
    case "ADD_SKU": {
      const existingIndex = state.items.findIndex(
        (i) => i.type === "sku_product" && cartItemKey(i) === cartItemKey(action.item),
      );
      if (existingIndex !== -1) {
        const updated = state.items.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const sku = item as CartSkuItem;
          return { ...sku, quantity: sku.quantity + action.item.quantity };
        });
        return { ...state, items: updated };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case "REMOVE_ITEM": {
      const target = state.items.find((i) => cartItemKey(i) === action.key);
      if (!target) return state;
      return {
        ...state,
        items: state.items.filter((item) => cartItemKey(item) !== action.key),
      };
    }
    case "UPDATE_SKU_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (i) => !(i.type === "sku_product" && i.skuProductId === action.skuProductId),
          ),
        };
      }
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.type !== "sku_product" || item.skuProductId !== action.skuProductId) return item;
          return { ...item, quantity: action.quantity };
        }),
      };
    }
    case "APPLY_DISCOUNT":
      return { ...state, discount: action.discount };
    case "REMOVE_DISCOUNT":
      return { ...state, discount: null };
    case "CLEAR":
      return { items: [], discount: null };
    default:
      return state;
  }
}
