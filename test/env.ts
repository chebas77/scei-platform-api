// Variables de entorno de pruebas (se cargan antes que cualquier módulo).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgres://postgres@127.0.0.1:54329/scei_test';
process.env.JWT_ACCESS_SECRET = 'test-jwt-secret-test-jwt-secret-test-jwt-secret';
process.env.SIGNING_KEY = 'test-signing-key-test-signing-key-test-signing';
process.env.MASTER_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.SWAGGER_ENABLED = 'true';
process.env.TENANT_PURGE_GRACE_DAYS = '7';
process.env.RATE_LIMIT_PER_MINUTE = '100000';
process.env.AUTH_RATE_LIMIT_PER_MINUTE = '100000';
process.env.LOGIN_MAX_ATTEMPTS = '5';
process.env.JWT_REFRESH_TTL_DAYS = '30';
