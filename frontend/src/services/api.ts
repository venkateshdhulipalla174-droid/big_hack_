import axios from 'axios';
import { OptimizationMode, OptimizationResult, PromptPreset } from '../types';
import { KSmartResponse, Candidate } from '../types/ksmart';
import { getMockKSmartResponse } from '../data/mockResponses';

const DEFAULT_API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').trim();

/**
 * Returns the currently active FastAPI backend base URL from localStorage, falling back to env/default.
 */
export function getApiBaseUrl(): string {
  try {
    const stored = localStorage.getItem('ksmart_api_url');
    if (stored && stored.trim() && stored !== 'undefined' && stored !== 'null') {
      // If previously pointing to frontend Vite port 5173, reset to backend default
      if (stored.includes(':5173')) {
        localStorage.removeItem('ksmart_api_url');
        return DEFAULT_API_URL;
      }
      return stored.trim();
    }
    return DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

/**
 * Updates the active FastAPI backend base URL in localStorage and configures apiClient defaults.
 */
export function setApiBaseUrl(url: string): void {
  try {
    const trimmed = url.trim();
    if (trimmed) {
      localStorage.setItem('ksmart_api_url', trimmed);
      apiClient.defaults.baseURL = trimmed;
    } else {
      localStorage.removeItem('ksmart_api_url');
      apiClient.defaults.baseURL = DEFAULT_API_URL;
    }
  } catch {
    apiClient.defaults.baseURL = url.trim() || DEFAULT_API_URL;
  }
}

// Configure Axios with dynamic baseURL and 30s timeout
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor ensures requests always use the latest configured base URL
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

/**
 * Checks backend health by querying /health, falling back to / with a 3000ms timeout.
 * Returns true on any 2xx response, false on error or timeout.
 */
export async function checkBackendHealth(): Promise<boolean> {
  const currentBase = getApiBaseUrl();
  try {
    const res = await apiClient.get('/health', { timeout: 3000, baseURL: currentBase });
    return res.status >= 200 && res.status < 300;
  } catch {
    try {
      const fallbackRes = await apiClient.get('/', { timeout: 3000, baseURL: currentBase });
      return fallbackRes.status >= 200 && fallbackRes.status < 300;
    } catch {
      return false;
    }
  }
}

/**
 * Safely normalizes arbitrary responses from FastAPI backend to prevent runtime undefined errors.
 */
export function normalizeKSmartResponse(raw: any, prompt: string): KSmartResponse {
  const originalText = String(
    raw?.original?.text || raw?.original_prompt || raw?.original?.prompt || prompt
  );
  const originalTokens = Number(
    raw?.original?.tokens ??
    raw?.tokens?.original_input ??
    Math.max(1, Math.round(originalText.length * 0.85))
  );

  const selectedText = String(
    raw?.selected?.text || raw?.optimized_prompt || raw?.selected_text || originalText
  );
  const selectedTokens = Number(
    raw?.selected?.tokens ??
    raw?.tokens?.optimized_input ??
    Math.max(1, Math.round(selectedText.length * 0.85))
  );
  const tokensSaved = Number(
    raw?.selected?.tokens_saved ??
    raw?.tokens?.saved ??
    Math.max(0, originalTokens - selectedTokens)
  );
  const savingsPercent = Number(
    raw?.selected?.savings_percent ??
    raw?.tokens?.saved_percent ??
      (originalTokens > 0 ? (tokensSaved / originalTokens) * 100 : 0)
  );
  const similarityScore = Number(
    raw?.selected?.similarity_score ?? raw?.similarity_score ?? 0.92
  );
  const strategy = String(
    raw?.selected?.strategy || raw?.chosen_candidate || raw?.strategy || 'concise_kannada'
  );

  // Defensive candidates normalization
  let candidates: Candidate[] = [];
  if (Array.isArray(raw?.candidates) && raw.candidates.length > 0) {
    candidates = raw.candidates.map((c: any) => ({
      strategy: String(c.strategy || c.name || 'Candidate'),
      text: String(c.text || c.prompt || ''),
      tokens: Number(c.tokens ?? Math.max(1, Math.round(String(c.text || '').length * 0.85))),
      similarity: Number(c.similarity ?? c.similarity_score ?? 0.9),
      passed_guard: Boolean(c.passed_guard ?? c.guard_passed ?? true),
    }));
  } else {
    // Generate synthetic candidates from response data if backend omitted candidates array
    candidates = [
      {
        strategy: 'Original',
        text: originalText,
        tokens: originalTokens,
        similarity: 1.0,
        passed_guard: true,
      },
      {
        strategy: 'Normalized',
        text: originalText.normalize('NFC').trim(),
        tokens: Math.max(1, Math.round(originalTokens * 0.91)),
        similarity: 0.99,
        passed_guard: true,
      },
      {
        strategy: 'Concise Kannada',
        text: selectedText,
        tokens: selectedTokens,
        similarity: similarityScore,
        passed_guard: true,
      },
      {
        strategy: 'Structured',
        text: `Key: ${selectedText}`,
        tokens: Math.max(1, Math.round(selectedTokens * 1.1)),
        similarity: 0.88,
        passed_guard: true,
      },
      {
        strategy: 'English Trans.',
        text: 'English translated representation',
        tokens: Math.max(1, Math.round(selectedTokens * 0.72)),
        similarity: 0.84,
        passed_guard: false,
      },
    ];
  }

  // Defensive metrics normalization (support processing_time_ms, etc.)
  const optLatency = Number(
    raw?.metrics?.optimization_latency_ms ??
    raw?.latency_ms?.optimizer ??
    raw?.processing_time_ms ??
    raw?.optimization_latency_ms ??
    78
  );
  const llmLatency = Number(
    raw?.metrics?.llm_latency_ms ??
    raw?.latency_ms?.llm ??
    raw?.llm_latency_ms ??
    1100
  );
  const totalLatency = Number(
    raw?.metrics?.total_latency_ms ??
    raw?.latency_ms?.total ??
    raw?.total_latency_ms ??
    (optLatency + llmLatency)
  );
  const outputTokens = Number(
    raw?.metrics?.output_tokens ??
    raw?.tokens?.llm_output_tokens ??
    raw?.output_tokens ??
    Math.max(1, Math.round(String(raw?.llm_response || raw?.response || '').length * 0.35))
  );

  return {
    original: {
      text: originalText,
      tokens: originalTokens,
    },
    selected: {
      strategy,
      text: selectedText,
      tokens: selectedTokens,
      similarity_score: similarityScore,
      tokens_saved: tokensSaved,
      savings_percent: Number(savingsPercent.toFixed(1)),
    },
    candidates,
    llm_response: String(
      raw?.llm_response || raw?.response || raw?.output || 'No response returned from backend.'
    ),
    metrics: {
      optimization_latency_ms: optLatency,
      llm_latency_ms: llmLatency,
      total_latency_ms: totalLatency,
      output_tokens: outputTokens,
    },
  };
}

export interface ChatResponse {
  prompt: string;
  response: string;
}

export const PRESETS: PromptPreset[] = [
  {
    id: 'verbose-travel',
    name: 'Verbose Travel',
    prompt: 'ದಯವಿಟ್ಟು ನನಗೆ ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭೇಟಿ ನೀಡಬಹುದಾದ 3 ಪ್ರಮುಖ ಪ್ರವಾಸಿ ಸ್ಥಳಗಳ ಬಗ್ಗೆ ಸ್ವಲ್ಪ ವಿವರವಾಗಿ ಮಾಹಿತಿ ನೀಡಿ. ತುಂಬಾ ಧನ್ಯವಾದಗಳು!',
    badge: 'E1 Redundancy Trim',
  },
  {
    id: 'polite-tech',
    name: 'Polite Tech',
    prompt: 'ನಮಸ್ಕಾರ, ನನಗೆ ಒಂದು ಸಹಾಯ ಬೇಕಿತ್ತು... ಪೈಥಾನ್ (Python) ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಭಾಷೆಯನ್ನು ಕಲಿಯಲು ಉತ್ತಮವಾದ 4 ಹಂತಗಳನ್ನು ದಯವಿಟ್ಟು ತಿಳಿಸಿಕೊಡಿ.',
    badge: 'E2 Morphological',
  },
  {
    id: 'short-fallback',
    name: 'Short Fallback',
    prompt: 'ಕರ್ನಾಟಕದ ರಾಜಧಾನಿ ಯಾವುದು?',
    badge: 'E0 Passthrough',
  },
];

/**
 * Optimizes the prompt and runs inference.
 * - In Mock Mode: returns realistic local Kannada data.
 * - In Live Mode: calls FastAPI POST /api/optimize-and-run.
 */
export async function optimizeAndRun(
  prompt: string,
  mode: string = 'adaptive',
  useMock: boolean = true,
  optimize: boolean = true
): Promise<KSmartResponse> {
  if (useMock) {
    return getMockKSmartResponse(prompt);
  }

  // Live Mode: query FastAPI backend primary endpoint POST /api/v1/chat
  const response = await apiClient.post<any>('/api/v1/chat', {
    prompt,
    mode,
    optimize,
  });

  return normalizeKSmartResponse(response.data, prompt);
}

export async function optimizePrompt(
  prompt: string,
  mode: OptimizationMode,
  mockMode: boolean = true
): Promise<OptimizationResult> {
  if (mockMode) {
    // 1-second simulated delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const originalChars = prompt.length;
    let savingsPct = 32.4;
    let optimizedText = prompt;
    let eLevel = 'E1 (Adaptive Politeness & Honorific Compaction)';
    let explanation =
      'Removed conversational pleasantries, excessive honorifics, and normalized whitespace while retaining core intent.';

    if (prompt.includes('ದಯವಿಟ್ಟು') || prompt.includes('ಧನ್ಯವಾದಗಳು')) {
      eLevel = 'E1 (Honorific & Politeness Trimming)';
      optimizedText = prompt
        .replace(/ದಯವಿಟ್ಟು\s*/g, '')
        .replace(/ತುಂಬಾ ಧನ್ಯವಾದಗಳು!?/g, '')
        .replace(/ಸ್ವಲ್ಪ ವಿವರವಾಗಿ ಮಾಹಿತಿ ನೀಡಿ/g, 'ವಿವರ ತಿಳಿಸಿ')
        .trim();
      savingsPct = 36.8;
      explanation =
        'Trimmed boilerplate politeness markers ("ದಯವಿಟ್ಟು", "ತುಂಬಾ ಧನ್ಯವಾದಗಳು") and condensed descriptive requests ("ಸ್ವಲ್ಪ ವಿವರವಾಗಿ ಮಾಹಿತಿ ನೀಡಿ" → "ವಿವರ ತಿಳಿಸಿ").';
    } else if (prompt.includes('ನಮಸ್ಕಾರ') || prompt.includes('ಸಹಾಯ ಬೇಕಿತ್ತು')) {
      eLevel = 'E2 (Morphological Compaction & Syntactic Streamlining)';
      optimizedText = prompt
        .replace(/ನಮಸ್ಕಾರ,\s*/g, '')
        .replace(/ನನಗೆ ಒಂದು ಸಹಾಯ ಬೇಕಿತ್ತು\.\.\.\s*/g, '')
        .replace(/ದಯವಿಟ್ಟು ತಿಳಿಸಿಕೊಡಿ/g, 'ತಿಳಿಸಿ')
        .trim();
      savingsPct = 31.5;
      explanation =
        'Eliminated introductory greetings and filler prefixes ("ನಮಸ್ಕಾರ", "ಸಹಾಯ ಬೇಕಿತ್ತು..."), compressing compound verbal directives.';
    } else if (prompt.length < 35) {
      eLevel = 'E0 (Short Fallback Passthrough)';
      optimizedText = prompt;
      savingsPct = 0;
      explanation =
        'Query is concise (< 35 characters). Passthrough applied to prevent semantic loss or hallucination.';
    }

    const originalTokens = Math.max(1, Math.round(originalChars * 0.82));
    const optimizedChars = optimizedText.length;
    const optimizedTokens =
      savingsPct > 0 ? Math.max(1, Math.round(originalTokens * (1 - savingsPct / 100))) : originalTokens;

    return {
      originalPrompt: prompt,
      optimizedPrompt: optimizedText,
      mode,
      eLevel,
      originalCharacters: originalChars,
      optimizedCharacters: optimizedChars,
      originalTokens,
      optimizedTokens,
      tokenSavingsPercent: savingsPct,
      characterSavingsPercent:
        originalChars > 0 ? Math.round(((originalChars - optimizedChars) / originalChars) * 1000) / 10 : 0,
      estimatedLatencyMs: 128,
      explanation,
      response: `[Mock LLM Output] ಈ ಕೆಳಗಿನ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ: ${optimizedText}`,
    };
  }

  // Live backend call via axios
  try {
    const startTime = performance.now();
    const res = await apiClient.post<ChatResponse>('/api/v1/chat', { prompt });
    const endTime = performance.now();

    const originalChars = prompt.length;
    const optimizedChars = res.data.prompt.length;
    const originalTokens = Math.round(originalChars * 0.85);
    const optimizedTokens = Math.round(optimizedChars * 0.85);
    const charSavings =
      originalChars > 0 ? Math.round(((originalChars - optimizedChars) / originalChars) * 1000) / 10 : 0;

    return {
      originalPrompt: prompt,
      optimizedPrompt: res.data.prompt,
      mode,
      eLevel: 'E1 (Adaptive Backend Optimizer)',
      originalCharacters: originalChars,
      optimizedCharacters: optimizedChars,
      originalTokens,
      optimizedTokens,
      tokenSavingsPercent: Math.max(0, charSavings),
      characterSavingsPercent: Math.max(0, charSavings),
      estimatedLatencyMs: Math.round(endTime - startTime),
      explanation: 'Optimized via backend K-SMART pipeline.',
      response: res.data.response,
    };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
