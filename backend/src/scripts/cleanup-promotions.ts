import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function cleanup() {
  const client = new MongoClient(process.env.MONGODB_URI || '');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('apr_finder');
    
    // Remove KuCoin promotion data
    const result = await db.collection('apr_data').deleteMany({ 
      platform: 'KuCoin',
      source: { $regex: /promotion/i }
    });
    
    console.log(`Deleted ${result.deletedCount} KuCoin promotion records`);
    
  } finally {
    await client.close();
  }
}

cleanup().catch(console.error);

