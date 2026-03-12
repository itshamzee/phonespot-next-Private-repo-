export type ShipmondoCarrier = "gls" | "postnord" | "dao";

export type ShipmondoShipmentRequest = {
  carrier_code: string;
  product_code: string;
  service_codes?: string;
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
