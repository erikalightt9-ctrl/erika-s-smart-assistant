import Anthropic from "@anthropic-ai/sdk";

const globalForClaude = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForClaude.anthropic ??
  new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

if (process.env.NODE_ENV !== "production") globalForClaude.anthropic = anthropic;
