import { WebUntisQR } from 'webuntis';
import { authenticator } from 'otplib';

export interface UntisConfig {
  serverUrl: string;
  school: string;
  username: string;
  secret: string;
  qrCodeUri?: string; // Store the original QR URI for WebUntisQR
}

export interface ParsedQRData {
  serverUrl: string;
  school: string;
  username: string;
  secret: string;
}

/**
 * Parse an untis:// URI string from QR code
 * Format: untis://server:port/school?user=username&secret=secretkey
 * 
 * Alternative format (mobile app): untis://setschool?url=server&school=school&user=username&key=secret
 * 
 * @param uri - The untis:// URI string
 * @returns Parsed Untis configuration or throws an error
 */
export function parseQRString(uri: string): ParsedQRData {
  console.log('[DEBUG parseQRString] Input URI:', JSON.stringify(uri));
  
  // Trim whitespace from input
  const trimmedUri = uri.trim();
  console.log('[DEBUG parseQRString] Trimmed URI:', JSON.stringify(trimmedUri));
  
  // Check if it's a valid untis URI
  if (!trimmedUri.startsWith('untis://')) {
    throw new Error('Invalid URI: Must start with untis://. Expected format: untis://server:port/school?user=username&secret=secretkey');
  }

  try {
    // Remove the untis:// prefix and parse
    const withoutProtocol = trimmedUri.replace('untis://', '');
    
    // Split by / to separate server and school
    const firstSlashIndex = withoutProtocol.indexOf('/');
    console.log('[DEBUG parseQRString] withoutProtocol:', JSON.stringify(withoutProtocol));
    console.log('[DEBUG parseQRString] firstSlashIndex:', firstSlashIndex);
    
    // Check if this is the alternative format: untis://setschool?url=...
    // Note: The alternative format may or may not have a slash, so we check for 'setschool' prefix
    // either before the slash or as the entire path before the query string
    let isSetschoolFormat = false;
    if (firstSlashIndex !== -1) {
      // Has slash: untis://setschool/... or untis://server/school
      isSetschoolFormat = withoutProtocol.substring(0, firstSlashIndex) === 'setschool';
    } else {
      // No slash: could be untis://setschool?url=... (alternative) or untis://server (original)
      const questionMarkIndex = withoutProtocol.indexOf('?');
      if (questionMarkIndex !== -1) {
        const pathPart = withoutProtocol.substring(0, questionMarkIndex);
        isSetschoolFormat = pathPart === 'setschool';
      } else {
        isSetschoolFormat = withoutProtocol === 'setschool';
      }
    }
    
    if (isSetschoolFormat) {
      // Alternative format: path is "setschool" and all params are in query string
      const questionMarkIndex = withoutProtocol.indexOf('?');
      if (questionMarkIndex === -1) {
        throw new Error('Invalid URI: Missing query parameters. Expected: untis://setschool?url=server&school=schoolname&user=username&key=secret');
      }
      
      const queryString = withoutProtocol.substring(questionMarkIndex + 1);
      const params = new URLSearchParams(queryString);
      
      const serverUrl = params.get('url');
      const school = params.get('school');
      const username = params.get('user');
      const secret = params.get('key'); // Mobile app uses 'key' instead of 'secret'
      
      if (!serverUrl) {
        throw new Error('Invalid URI: Missing url parameter');
      }
      if (!school) {
        throw new Error('Invalid URI: Missing school name. For setschool format, use: untis://setschool?url=server&school=schoolname&user=username&key=secret');
      }
      if (!username) {
        throw new Error('Invalid URI: Missing user parameter');
      }
      if (!secret) {
        throw new Error('Invalid URI: Missing key parameter');
      }
      
      return {
        serverUrl,
        school,
        username,
        secret,
      };
    }
    
    // Original format: untis://server:port/school?user=username&secret=secretkey
    if (firstSlashIndex === -1) {
      throw new Error('Invalid URI: Missing school name. Expected format: untis://server:port/school?user=username&secret=secretkey');
    }
    
    const serverPart = withoutProtocol.substring(0, firstSlashIndex);
    const remaining = withoutProtocol.substring(firstSlashIndex + 1);
    
    // Parse school and query parameters
    const questionMarkIndex = remaining.indexOf('?');
    if (questionMarkIndex === -1) {
      throw new Error('Invalid URI: Missing query parameters. Expected: untis://server:port/school?user=username&secret=secretkey');
    }
    
    const school = decodeURIComponent(remaining.substring(0, questionMarkIndex));
    const queryString = remaining.substring(questionMarkIndex + 1);
    
    // Parse query parameters
    const params = new URLSearchParams(queryString);
    const username = params.get('user');
    const secret = params.get('secret');
    
    if (!username) {
      throw new Error('Invalid URI: Missing user parameter');
    }
    if (!secret) {
      throw new Error('Invalid URI: Missing secret parameter');
    }
    
    // Build server URL (remove port if present for WebUntisQR)
    const colonIndex = serverPart.indexOf(':');
    const serverUrl = colonIndex !== -1 
      ? serverPart.substring(0, colonIndex) 
      : serverPart;
    
    return {
      serverUrl,
      school,
      username,
      secret,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to parse URI: Invalid format');
  }
}

/**
 * Test a connection to WebUntis using the provided configuration
 * 
 * @param config - Untis configuration with server, school, username, and secret
 * @returns true if connection successful, throws error otherwise
 */
export async function testConnection(config: UntisConfig): Promise<boolean> {
  console.log('[DEBUG testConnection] Received config:', JSON.stringify(config));
  console.log('[DEBUG testConnection] qrCodeUri in config:', config.qrCodeUri);
  
  // WebUntisQR expects the full QR code URI, not individual parameters
  // If we have the original QR URI, use it; otherwise construct one
  const qrCodeUri = config.qrCodeUri || `untis://${config.serverUrl}/${config.school}?user=${config.username}&secret=${config.secret}`;
  
  console.log('[DEBUG testConnection] Using QR URI:', qrCodeUri);
  console.log('[DEBUG testConnection] Authenticator type:', typeof authenticator);
  console.log('[DEBUG testConnection] Authenticator:', authenticator);
  
  const untis = new WebUntisQR(
    qrCodeUri,
    'untis-tools', // identity/app name
    authenticator
  );

  try {
    await untis.login();
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    throw new Error('Connection failed: Unknown error');
  } finally {
    // Always logout to clean up the session
    try {
      await untis.logout();
    } catch {
      // Ignore logout errors
    }
  }
}

/**
 * Validate that all required fields are present in the config
 */
export function validateConfig(config: Partial<UntisConfig>): config is UntisConfig {
  return (
    typeof config.serverUrl === 'string' &&
    config.serverUrl.length > 0 &&
    typeof config.school === 'string' &&
    config.school.length > 0 &&
    typeof config.username === 'string' &&
    config.username.length > 0 &&
    typeof config.secret === 'string' &&
    config.secret.length > 0
  );
}
