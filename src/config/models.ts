/**
 * Qalam AI Centralized Gemini Model Configuration
 * Primary model: gemini-3.8-flash
 * Secondary fallback model: gemini-3.7-flash (verified active model)
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash' as const;
export const SECONDARY_GEMINI_MODEL = 'gemini-3.7-flash' as const;

export const SUPPORTED_GEMINI_MODELS = [
  DEFAULT_GEMINI_MODEL,
  SECONDARY_GEMINI_MODEL,
] as const;

export type SupportedGeminiModel = typeof SUPPORTED_GEMINI_MODELS[number];

/**
 * Server-side fallback chain used for resilient Gemini operations.
 * Strictly excludes deprecated / shutdown models (such as gemini-1.5-flash and gemini-2.0-flash).
 */
export const SERVER_FALLBACK_MODEL_CHAIN: SupportedGeminiModel[] = [
  DEFAULT_GEMINI_MODEL,
  SECONDARY_GEMINI_MODEL,
];

