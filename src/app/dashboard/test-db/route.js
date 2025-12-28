// src/app/api/test-db/route.js
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  try {
    // Build URI from environment variables
    const {
      DB_USER,
      DB_PASS,
      DB_HOST,
      DB_PORT,
      DB_NAME,
      TLS_CA_FILE
    } = process.env;

    const tlsPath = TLS_CA_FILE.replace(/\\/g, '/');
    const uri = `mongodb://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;

    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      database: DB_NAME,
      collections: collections.map(c => c.name),
      message: 'MongoDB connected successfully'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}