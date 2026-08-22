/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", {
      useESM: false,
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@keystone-6|@prisma|@types))',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/pgdata',
    '<rootDir>/redisdata',
    '<rootDir>/node_modules'
  ],
};

export default config;
