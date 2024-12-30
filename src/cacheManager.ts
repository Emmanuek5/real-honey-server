import { writeFile, readFile } from 'fs/promises';
import { CacheData, CouponData } from './types';
import { CACHE_FILE, UPDATE_INTERVAL } from './config';
import { getCouponIds, getCouponData } from './couponService';
import { delay } from './utils';

export class CacheManager {
  private cache: CacheData = {};
  private trackedDomains: Set<string> = new Set();

  async loadCache() {
    try {
      const data = await readFile(CACHE_FILE, 'utf-8');
      this.cache = JSON.parse(data);
      this.trackedDomains = new Set(Object.keys(this.cache));
      console.log('Cache loaded successfully');
    } catch (error) {
      console.log('No cache file found, starting fresh');
      this.cache = {};
    }
  }

  async saveCache() {
    try {
      await writeFile(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  async updateCouponsForDomain(domain: string) {
    try {
      const couponIds = await getCouponIds(domain);
      
      if (couponIds.length === 0) {
        console.log(`No coupon IDs found for ${domain}`);
        this.cache[domain] = {
          coupons: [],
          lastUpdated: Date.now()
        };
        await this.saveCache();
        return [];
      }

      const couponsData = await Promise.all(
        couponIds.map(id => getCouponData(id, domain))
      );

      // Remove duplicates based on code and description
      const uniqueCoupons = couponsData.reduce((acc: CouponData[], current) => {
        const isDuplicate = acc.some(coupon => 
          (current.code && coupon.code === current.code) ||
          (coupon.description === current.description) ||
          (coupon.title === current.title)
        );

        if (!isDuplicate && current.code.trim() !== '') {
          acc.push(current);
        }
        return acc;
      }, []);

      if (uniqueCoupons.length === 0) {
        console.log(`No valid coupons found for ${domain} after filtering`);
      } else {
        console.log(`Found ${uniqueCoupons.length} unique coupons for ${domain}`);
      }

      this.cache[domain] = {
        coupons: uniqueCoupons,
        lastUpdated: Date.now()
      };

      await this.saveCache();
      return uniqueCoupons;
    } catch (error) {
      console.error(`Error updating coupons for ${domain}:`, error);
      // Still cache the empty result to prevent constant retries
      this.cache[domain] = {
        coupons: [],
        lastUpdated: Date.now()
      };
      await this.saveCache();
      return [];
    }
  }

  async addNewDomain(domain: string): Promise<CouponData[]> {
    if (!this.trackedDomains.has(domain)) {
      console.log(`Adding new domain to tracking: ${domain}`);
      this.trackedDomains.add(domain);
      return await this.updateCouponsForDomain(domain);
    }

    // Get existing coupons
    const existingCoupons = this.getCouponsForDomain(domain);
    
    // If we have no coupons, try to fetch them again
    if (existingCoupons.length === 0) {
      console.log(`No coupons found for ${domain}, fetching new ones...`);
      return await this.updateCouponsForDomain(domain);
    }

    return existingCoupons;
  }

  async startPeriodicUpdates(stores: { domain: string }[]) {
    console.log('Starting periodic updates');
    stores.forEach(store => this.trackedDomains.add(store.domain));
    
    while (true) {
      for (const domain of this.trackedDomains) {
        const currentCoupons = this.getCouponsForDomain(domain);
        if (currentCoupons.length === 0 || this.needsUpdate(domain)) {
          await this.updateCouponsForDomain(domain);
        }
        await delay(5000);
      }
      await delay(UPDATE_INTERVAL);
    }
  }

  getCouponsForDomain(domain: string): CouponData[] {
    return this.cache[domain]?.coupons || [];
  }

  needsUpdate(domain: string): boolean {
    const cachedData = this.cache[domain];
    const now = Date.now();
    return !cachedData || (now - cachedData.lastUpdated) > UPDATE_INTERVAL;
  }
}
