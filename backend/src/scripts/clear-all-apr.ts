import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function clearAll() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('apr_finder');
    
    // Clear all APR data
    const result = await db.collection('apr_data').deleteMany({});
    console.log(`[OK] Cleared ${result.deletedCount} APR records`);
    
    console.log('Database cleared! Restart the server to fetch fresh data.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

clearAll();

