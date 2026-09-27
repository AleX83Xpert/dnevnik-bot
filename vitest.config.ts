import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [
      'node_modules',
      '.keystone',
      'pgdata',
      'redisdata',
      // Integration tests require live Prisma DB — move DB_URL env to run them
      'schema.test.ts',
      'user.test.ts',
      'core/tokenRefresher.test.ts',
      'core/userRepo.test.ts',
    ],
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['core/**', 'clients/**', 'transports/**'],
      exclude: ['**/*.test.ts'],
    },
  },
});
