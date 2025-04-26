import type {Config} from 'jest'

const config: Config = {
  verbose: true,
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  modulePathIgnorePatterns: [
    '<rootDir>/pgdata',
    '<rootDir>/redisdata',
    '<rootDir>/node_modules'
  ],
};

export default config
