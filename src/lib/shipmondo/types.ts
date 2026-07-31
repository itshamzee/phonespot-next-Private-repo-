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
  pickup_point_id?: string;
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
  tracking_number: string;
  tracking_url: string;
  label_url: string;
  parcels: Array<{
    tracking_number: string;
    tracking_url: string;
  }>;
};

export type ShipmondoPickupPoint = {
  id: string;
  company_name: string;
  address: string;
  zipcode: string;
  city: string;
  country_code: string;
  latitude: number;
  longitude: number;
  opening_hours?: string;
  distance_in_meters?: number;
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
