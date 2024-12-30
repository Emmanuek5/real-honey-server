import { config } from 'dotenv';
import { CacheManager } from './src/cacheManager';
import { loadStores } from './src/couponService';
import { MAX_COUPONS_TO_RETURN } from './src/config';
import { shuffleArray } from './src/utils';
import { CouponResponse } from './src/types';

// Load environment variables
config();

// Initialize cache manager
const cacheManager = new CacheManager();

// Initialize the server
async function initServer() {
  const stores = await loadStores();
  await cacheManager.loadCache();
  cacheManager.startPeriodicUpdates(stores); // Start background updates

  const server = Bun.serve({
    port: process.env.PORT || 3000,
    async fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname.startsWith('/api/coupons/')) {
        const domain = url.pathname.split('/api/coupons/')[1];
        if (!domain) {
          const response: CouponResponse = {
            message: 'Store domain is required',
            store: '',
            coupons: [],
            success: false,
            error: 'Missing domain parameter'
          };
          return new Response(JSON.stringify(response), { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        console.log(`Processing request for ${domain}`);
        
        try {
          // Add domain to tracking and get coupons
          const coupons = await cacheManager.addNewDomain(domain);
          console.log(`Returning ${coupons.length} coupons for ${domain}`);
          
          if (coupons.length === 0) {
            const response: CouponResponse = {
              message: 'No coupons found for this store',
              store: domain,
              coupons: [],
              success: true
            };
            return new Response(JSON.stringify(response), {
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }

          const randomCoupons = shuffleArray(coupons).slice(0, MAX_COUPONS_TO_RETURN);
          const response: CouponResponse = {
            message: `Found ${randomCoupons.length} coupons`,
            store: domain,
            coupons: randomCoupons,
            success: true
          };

          return new Response(JSON.stringify(response), {
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        } catch (error: any) {
          console.error('Error:', error);
          const response: CouponResponse = {
            message: 'Failed to fetch coupons',
            store: domain,
            error: error.message,
            coupons: [],
            success: false
          };
          return new Response(JSON.stringify(response), { 
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }

      const response: CouponResponse = {
        message: 'Not Found',
        store: '',
        coupons: [],
        success: false,
        error: 'Invalid endpoint'
      };
      return new Response(JSON.stringify(response), { 
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    },
  });

  console.log(`Server running at http://localhost:${server.port}`);
}

// Start the server
initServer().catch(console.error);