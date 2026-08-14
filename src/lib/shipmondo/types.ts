export type ShipmondoCarrier = "gls" | "pdk";

export type ShipmondoShipmentRequest = {
  carrier_code: string;
  product_code: string;
  /**
   * Required by POST /shipments. Comma-separated; PostNord rejects a booking
   * with none of EMAIL_NT / SMS_NT ("At least one of the following services are
   * required"). The client fills in EMAIL_NT when a caller leaves it out.
   */
  service_codes?: string;
  /**
   * Required by POST /shipments — omitting it fails with "Parameter(s):
   * own_agreement invalid or missing". False means Shipmondo's own carrier
   * agreement, which is the one this account ships on.
   */
  own_agreement?: boolean;
  sender: ShipmondoAddress;
  receiver: ShipmondoAddress;
  parcels: ShipmondoParcel[];
  /**
   * Shipmondo's field for the customer's chosen parcel shop. The API silently
   * ignores unknown fields, so a misspelling here ("pickup_point_id") made
   * every ShopDelivery booking fail with "A service point is required" —
   * verified against the live API 2026-08-14.
   */
  service_point_id?: string;
  reference?: string;
};

export type ShipmondoAddress = {
  name: string;
  attention?: string;
  address1: string;
  address2?: string;
  zipcode: string;
  city: string;
  country_code: string;
  email?: string;
  phone?: string;
};

export type ShipmondoParcel = {
  weight: number;
  length?: number;
  width?: number;
  height?: number;
};

export type ShipmondoShipmentResponse = {
  id: number;
  carrier_code: string;
  product_code: string;
  /**
   * The tracking number. Shipmondo calls it pkg_no — there is no
   * `tracking_number` field on the response, and reading one gave undefined,
   * so every label was stored without a tracking number and the status webhook
   * (which looks a parcel up by exactly that) could never match anything.
   */
  pkg_no: string;
  external_pkg_no?: string | null;
  price?: number;
  parcels?: Array<{ pkg_no?: string }>;
};

/** Matches an actual GET /pickup_points response, checked 2026-07-31. */
export type ShipmondoPickupPoint = {
  id: string;
  number?: string;
  company_name?: string;
  name?: string;
  address?: string;
  address2?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  carrier_code?: string;
  agent?: string;
  latitude?: number;
  longitude?: number;
  /** One string per weekday: "Monday: 10:00-18:00". */
  opening_hours?: string[];
  /** Null on every response seen so far, so nothing sorts by it. */
  distance?: number | null;
};

export type ShipmondoRateQuote = {
  carrier_code: string;
  product_code: string;
  product_name: string;
  price: number;
  price_incl_vat: number;
  delivery_days?: number;
  is_pickup: boolean;
};

export type ShipmondoError = {
  error: string;
  message: string;
  status: number;
};

export type ShippingMethod =
  /** One parcel-shop choice; the shop the customer picks decides the carrier. */
  | "pakkeshop"
  | "postnord"
  | "dao"
  | "pickup_slagelse"
  | "pickup_vejle"
  | "gls_home"
  | "gls_pickup"
  | "postnord_home"
  | "postnord_pickup"
  | "dao_pickup"
  | "click_collect_slagelse"
  | "click_collect_vejle";

export type ShippingOption = {
  method: ShippingMethod;
  label: string;
  price: number;
  delivery_estimate?: string;
  requires_pickup_point: boolean;
  carrier_code?: string;
  product_code?: string;
};

export type SelectedPickupPoint = {
  id: string;
  name: string;
  address: string;
  zipcode: string;
  city: string;
};
