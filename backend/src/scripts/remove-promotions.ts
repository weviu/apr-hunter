import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function removePromotions() {
  const uri = process.env.MONGODB_URI || '';
  console.log('[INFO] Using URI:', uri ? 'Found' : 'NOT FOUND');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('[OK] Connected to MongoDB');
    
    const db = client.db('apr-finder');
    
    // Count total documents first
    const total = await db.collection('apr_data').countDocuments();
    console.log(`[INFO] Total documents in apr_data: ${total}`);
    
    // Get sample of sources
    const samples = await db.collection('apr_data').distinct('source');
    console.log(`[INFO] Sources in DB:`, samples);
    
    // Count promotion products
    const count = await db.collection('apr_data').countDocuments({
      source: { $regex: 'promotion' }
    });
    console.log(`[INFO] Found ${count} promotion products`);
    
    // Remove all promotion products
    const result = await db.collection('apr_data').deleteMany({
      source: { $regex: 'promotion' }
    });
    
    console.log(`[OK] Deleted ${result.deletedCount} promotion products`);
    
  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    await client.close();
  }
}

removePromotions();

