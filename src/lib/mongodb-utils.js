// src/lib/mongodb-utils.js
import clientPromise from './mongodb';

export async function getDatabase() {
  const client = await clientPromise;
  return client.db(process.env.DB_NAME || 'apr-hunter');
}

export async function getCollection(collectionName) {
  const db = await getDatabase();
  return db.collection(collectionName);
}

// Helper functions for your collections
export async function getUsers() {
  return getCollection('users');
}

export async function getAprHistory() {
  return getCollection('apr_history');
}

export async function getAprSnapshots() {
  return getCollection('apr_snapshots');
}