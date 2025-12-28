// src/config/database.js - NO dotenv config at the top!
// dotenv-cli loads .env.local before this runs

function getMongoConfig() {
  const {
    DB_USER,
    DB_PASS,
    DB_HOST,
    DB_PORT,
    DB_NAME,
    TLS_CA_FILE
  } = process.env;

  if (!TLS_CA_FILE) {
    throw new Error('TLS_CA_FILE is not set in environment variables');
  }

  // Convert Windows paths
  const tlsPath = TLS_CA_FILE.replace(/\\/g, '/');
  
  const uri = `mongodb://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?authSource=admin&tls=true&tlsCAFile=${tlsPath}&tlsAllowInvalidCertificates=true`;
  
  return {
    uri,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  };
}

module.exports = getMongoConfig();