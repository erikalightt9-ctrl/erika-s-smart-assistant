import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  coverageThreshold: {
    global: { lines: 80 },
  },
  collectCoverageFrom: [
    "lib/services/**/*.ts",
    "lib/repositories/**/*.ts",
    "lib/validations/**/*.ts",
    "!lib/auth.ts",
    "!lib/mailer.ts",
    "!lib/claude.ts",
    "!lib/prisma.ts",
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

export default createJestConfig(config);
