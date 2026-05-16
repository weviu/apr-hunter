import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db/mongodb';

const COL = 'users';

export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === 'string' ? new ObjectId(id) : id;
}

/** Create a new user. Throws if email is already taken (unique index violation). */
export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<string> {
  const db = await getMongoDb();
  if (!db) throw new Error('Database unavailable');
  const now = new Date();
  const result = await db.collection(COL).insertOne({
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    name: data.name,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toHexString();
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db
    .collection<UserDocument>(COL)
    .findOne({ email: email.toLowerCase().trim() });
}

export async function findUserById(id: string | ObjectId): Promise<UserDocument | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<UserDocument>(COL).findOne({ _id: toId(id) });
}

export async function updateUserPassword(
  userId: string | ObjectId,
  newPasswordHash: string,
): Promise<boolean> {
  const db = await getMongoDb();
  if (!db) return false;
  const result = await db.collection(COL).updateOne(
    { _id: toId(userId) },
    { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}
