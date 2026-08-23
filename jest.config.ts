/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
          },
          target: "es2022",
        },
      },
    ],
  },
  transformIgnorePatterns: [],
  modulePathIgnorePatterns: [
    "<rootDir>/pgdata",
    "<rootDir>/redisdata",
    "<rootDir>/node_modules",
  ],
};

export default config;
