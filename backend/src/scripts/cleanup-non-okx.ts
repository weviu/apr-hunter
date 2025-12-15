import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function cleanup() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('apr_finder');
    
    // Remove all non-OKX data
    const result = await db.collection('apr_data').deleteMany({ platform: { $ne: 'OKX' } });
    console.log(`[OK] Deleted ${result.deletedCount} non-OKX records`);
    
    // Also clean history
    const historyResult = await db.collection('apr_history').deleteMany({ platform: { $ne: 'OKX' } });
    console.log(`[OK] Deleted ${historyResult.deletedCount} non-OKX history records`);
    
    // Count remaining
    const count = await db.collection('apr_data').countDocuments({ platform: 'OKX' });
    console.log(`[INFO] Remaining OKX records: ${count}`);
    
    console.log('\n[OK] Cleanup complete! Only OKX data remains.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

cleanup();

