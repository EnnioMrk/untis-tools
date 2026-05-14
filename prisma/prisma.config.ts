import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config as loadEnv } from 'dotenv';

// Load .env file from project root
loadEnv({ path: path.join(__dirname, '..', '.env') });

export default defineConfig({
    schema: path.join(__dirname, 'schema.prisma'),
    datasource: {
        url: process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://localhost:5432/placeholder',
    },
});
