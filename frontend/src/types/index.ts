export type TabType = 'playground' | 'benchmark';

export type OptimizationMode = 'adaptive' | 'compare' | 'compare_all';

export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  badge?: string;
}

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  mode: OptimizationMode;
  eLevel: string;
  originalCharacters: number;
  optimizedCharacters: number;
  originalTokens: number;
  optimizedTokens: number;
  tokenSavingsPercent: number;
  characterSavingsPercent: number;
  estimatedLatencyMs: number;
  explanation: string;
  response: string;
}
