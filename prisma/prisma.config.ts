import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: path.join(__dirname, 'schema.prisma'),
    datasource: {
        url: env('DATABASE_URL') || env('POSTGRES_URL') || 'postgresql://localhost:5432/placeholder',
    },
});
