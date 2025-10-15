import { POLLING_PRICE_INTERVAL_MS } from '@/services/Config';
import { pollPrice } from '@/services/Price';

async function runWorker() {
  console.log('Worker started at', new Date().toISOString()); /* eslint-disable-line no-console */
  console.log(`Polling interval: ${POLLING_PRICE_INTERVAL_MS}ms`); /* eslint-disable-line no-console */

  while (true) {
    try {
      console.log(`[${new Date().toISOString()}] Fetching BTC price...`); /* eslint-disable-line no-console */

      // Await the price polling
      await pollPrice();

      console.log(`[${new Date().toISOString()}] Price fetched successfully. Waiting ${POLLING_PRICE_INTERVAL_MS}ms...`); /* eslint-disable-line no-console */

      await new Promise(resolve => setTimeout(resolve, POLLING_PRICE_INTERVAL_MS));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Worker error:`, error);
      // Continue running even if there's an error
      await new Promise(resolve => setTimeout(resolve, POLLING_PRICE_INTERVAL_MS));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Worker shutting down gracefully...'); /* eslint-disable-line no-console */
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Worker shutting down gracefully...'); /* eslint-disable-line no-console */
  process.exit(0);
});

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

runWorker().catch((error) => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});
