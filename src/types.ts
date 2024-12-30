export interface Store {
  name: string;
  domain: string;
}

export interface CouponData {
  code: string;
  description: string;
  title: string;
  website: string;
  lastUpdated: number;
}

export interface CacheData {
  [domain: string]: {
    coupons: CouponData[];
    lastUpdated: number;
  };
}

export interface CouponResponse {
  message: string;
  store: string;
  coupons: CouponData[];
  error?: string;
  success: boolean;
}
