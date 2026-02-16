const requiredServerEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FCM_PROJECT_ID',
  'FCM_CLIENT_EMAIL',
  'FCM_PRIVATE_KEY',
  'ADMIN_SESSION_SECRET'
] as const;

const requiredSupabaseEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const requiredFcmEnv = ['FCM_PROJECT_ID', 'FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY'] as const;
const requiredAdminEnv = ['ADMIN_SESSION_SECRET'] as const;
const requiredCronEnv = ['CRON_SECRET'] as const;

function getMissingEnv(keys: readonly string[]) {
  return keys.filter((key) => !process.env[key]);
}

export function validateServerEnv() {
  const missing = getMissingEnv(requiredServerEnv);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export function validateSupabaseEnv() {
  const missing = getMissingEnv(requiredSupabaseEnv);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export function validateFcmEnv() {
  const missing = getMissingEnv(requiredFcmEnv);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export function validateAdminEnv() {
  const missing = getMissingEnv(requiredAdminEnv);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export function validateCronEnv() {
  const missing = getMissingEnv(requiredCronEnv);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

export function getServerEnv(key: (typeof requiredServerEnv)[number]) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  if (key === 'FCM_PRIVATE_KEY') {
    return value.replace(/\\n/g, '\n');
  }

  return value;
}
