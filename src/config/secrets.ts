import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads environment variables from .env.secrets file into process.env
 * This keeps sensitive API keys separate from the main .env.local file
 */
export function loadSecrets(): void {
  const platform = process.platform;
  const isWindows = platform === 'win32';

  // Determine which secrets file to load
  const secretsFileName = isWindows ? '.env.secrets' : '.env.secrets';
  const secretsPath = path.resolve(process.cwd(), secretsFileName);

  // Skip if file doesn't exist (allow graceful degradation)
  if (!fs.existsSync(secretsPath)) {
    console.warn(`⚠️  No ${secretsFileName} file found. API keys will not be loaded.`);
    return;
  }

  try {
    const content = fs.readFileSync(secretsPath, 'utf8');
    
    // Parse the .env.secrets file
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const cleanKey = key.trim();
        const cleanValue = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        
        // Only set if not already defined (allows .env.local to override)
        if (!process.env[cleanKey]) {
          process.env[cleanKey] = cleanValue;
        }
      }
    });

    console.log(`✅ Secrets loaded from ${secretsFileName}`);
  } catch (error) {
    console.error(`❌ Error loading secrets from ${secretsFileName}:`, error);
    // Don't throw - allow app to start with missing secrets (will fail gracefully at runtime)
  }
}

// Auto-load secrets when this module is imported
loadSecrets();
