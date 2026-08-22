// Test utilities for KeystoneJS v8
// Uses CommonJS-compatible imports for Jest
import { randomBytes } from 'crypto';
import { faker } from '@faker-js/faker';

// Mock Prisma client for tests
class MockPrismaClient {
  async $connect() {}
  async $disconnect() {}
  $use(cb: any) {}
}

const mockPrisma = new MockPrismaClient();

// Generate test data
export function generateTestPlatformUserId(): string {
  return `test_fake_${faker.string.uuid()}`;
}

export async function createTestMessengerUser(
  context: any,
  attrs: Record<string, any> = {}
): Promise<{ data: Record<string, any>; obj: Record<string, any> }> {
  const data = {
    platform: 'telegram',
    platformUserId: generateTestPlatformUserId(),
    ...attrs,
  };

  const obj = await context.query.MessengerUser.createOne({
    data,
    query: `id platform platformUserId meta`,
  });

  return { data, obj };
}

export async function updateTestMessengerUser(
  context: any,
  id: string,
  data: Record<string, any> = {}
): Promise<Record<string, any>> {
  return await context.query.MessengerUser.updateOne({
    where: { id },
    data,
    query: `id platform platformUserId meta`,
  });
}

export function decrypt(value: string, secret: string): string {
  // Simple mock for tests
  return value;
}

export function encrypt(value: string, secret: string): string {
  // Simple mock for tests
  return value;
}
