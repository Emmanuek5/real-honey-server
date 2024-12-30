import { readFile } from 'fs/promises';
import { CouponData, Store } from './types';
import { USER_AGENT, COUPON_API_URL, WEBSITE_LINK } from './config';
import { retry } from './utils';
import { text } from 'express';

export async function getCouponIds(domain: string): Promise<string[]> {
 
  console.log(WEBSITE_LINK + domain);
  
  const res = await retry(() =>
    fetch(WEBSITE_LINK + domain, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      method: 'GET',
    })
  );

  const data = await res.text();

  
  const regex = /data-cid="(\d+)"/g;
  const matches = data.matchAll(regex);
  const couponIds: string[] = [];
  
  for (const match of matches) {
    couponIds.push(match[1]);
  }


  
  console.log(`Found ${couponIds.length} coupon IDs`);
  return couponIds;
}

export async function getCouponData(couponId: string, domain: string): Promise<CouponData> {
  
  const res = await retry(() =>
    fetch(COUPON_API_URL, {
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: couponId, domainName: domain }),
      method: 'POST',
    })
  );

  const data = await res.json();
  
  return {
    code: data.code || '',
    description: data.desc || '',
    title: data.title || '',
    website: 'CouponFollow',
    lastUpdated: Date.now()
  };
}

export async function loadStores(): Promise<Store[]> {
  try {
    const data = await readFile('./stores.json', 'utf-8');
    const stores = JSON.parse(data);
    console.log('Stores loaded successfully');
    return stores;
  } catch (error) {
    console.error('Error loading stores:', error);
    return [];
  }
}
