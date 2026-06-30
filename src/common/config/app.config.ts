import 'dotenv/config';

interface AppConfig {
  jwt_access_secret: string;
  jwt_refresh_secret: string;
  redis_cache_key_prefix: string;
  node_env: string;
  port: number;
  email_host: string;
  email_port: number;
  email_user: string;
  email_pass: string;
  email_from: string;
  // Google OAuth
  google_client_id: string;
  google_client_secret: string;
  google_redirect_uri: string;
  cors_origins: string[];
  // AWS S3
  aws_region: string;
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_s3_bucket: string;
  // Lulu Print API
  lulu_api_base_url: string;
  lulu_client_key: string;
  lulu_client_secret: string;
  lulu_shipping_origin_country: string;
}

const parseCsv = (value?: string): string[] =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const config: AppConfig = {
  jwt_access_secret:
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '',
  jwt_refresh_secret:
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || '',
  redis_cache_key_prefix: process.env.REDIS_CACHE_KEY_PREFIX || 'app',
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  email_host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  email_port: parseInt(process.env.EMAIL_PORT || '587', 10),
  email_user: process.env.EMAIL_USER || '',
  email_pass: process.env.EMAIL_PASS || '',
  email_from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
  // Google OAuth
  google_client_id: process.env.GOOGLE_CLIENT_ID || '',
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
  google_redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
  cors_origins: parseCsv(process.env.CORS_ORIGINS),
  // AWS S3
  aws_region: process.env.AWS_REGION || 'us-east-1',
  aws_access_key_id: process.env.AWS_ACCESS_KEY_ID || '',
  aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || '',
  aws_s3_bucket: process.env.AWS_S3_BUCKET || 'wonder-emporium-books',
  // Lulu Print API
  lulu_api_base_url: process.env.LULU_API_BASE_URL || 'https://api.lulu.com',
  lulu_client_key: process.env.LULU_CLIENT_KEY || '',
  lulu_client_secret: process.env.LULU_CLIENT_SECRET || '',
  lulu_shipping_origin_country:
    process.env.LULU_SHIPPING_ORIGIN_COUNTRY || 'US',
};

export default config;
