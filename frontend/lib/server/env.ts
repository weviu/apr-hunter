export type RuntimeEnv = {
  MONGODB_URI: string;
  MONGODB_DB_NAME: string;
  JWT_SECRET: string;
  ENABLE_DATA_COLLECTION: boolean;
};

// Centralized runtime env access to avoid scattering default values.
export const runtimeEnv: RuntimeEnv = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'apr_finder',
  JWT_SECRET: process.env.JWT_SECRET || 'apr-finder-secret-key-change-in-production',
  ENABLE_DATA_COLLECTION: process.env.ENABLE_DATA_COLLECTION !== 'false',
};

