import { KSmartResponse } from '../types/ksmart';

export function getMockKSmartResponse(prompt: string): KSmartResponse {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase().replace(/[!.,?]/g, '');

  // Casual greetings ("hey", "hi", "hello", "ನಮಸ್ಕಾರ")
  const isGreeting =
    lower === 'hey' ||
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'namaskara' ||
    lower === 'namaste' ||
    trimmed === 'ನಮಸ್ಕಾರ' ||
    trimmed === 'ನಮಸ್ಕಾರ!' ||
    lower.startsWith('hey ') ||
    lower.startsWith('hi ') ||
    lower.startsWith('hello ') ||
    trimmed.startsWith('ನಮಸ್ಕಾರ');

  if (isGreeting) {
    return {
      original: {
        text: prompt,
        tokens: 4,
      },
      selected: {
        strategy: 'conversational_passthrough',
        text: prompt,
        tokens: 4,
        similarity_score: 1.0,
        tokens_saved: 0,
        savings_percent: 0,
      },
      candidates: [
        {
          strategy: 'original',
          text: prompt,
          tokens: 4,
          similarity: 1.0,
          passed_guard: true,
        },
        {
          strategy: 'conversational_passthrough',
          text: prompt,
          tokens: 4,
          similarity: 1.0,
          passed_guard: true,
        },
        {
          strategy: 'concise_kannada',
          text: 'ನಮಸ್ಕಾರ',
          tokens: 3,
          similarity: 0.98,
          passed_guard: true,
        },
        {
          strategy: 'normalized_raw',
          text: prompt,
          tokens: 4,
          similarity: 1.0,
          passed_guard: true,
        },
        {
          strategy: 'extreme_trimmed',
          text: 'ಹಾಯ್',
          tokens: 1,
          similarity: 0.7,
          passed_guard: false,
        },
      ],
      llm_response:
        'ನಮಸ್ಕಾರ! (Hey!) Ask me anything in Kannada or English—I\'ll optimize your prompt behind the scenes to save tokens while preserving full meaning.',
      metrics: {
        optimization_latency_ms: 24,
        llm_latency_ms: 410,
        total_latency_ms: 434,
        output_tokens: 34,
      },
    };
  }

  // Preset 1: Verbose Travel (contains "ಬೆಂಗಳೂರು")
  if (trimmed.includes('ಬೆಂಗಳೂರು') || trimmed.includes('ಪ್ರವಾಸಿ')) {
    return {
      original: {
        text: prompt,
        tokens: 48,
      },
      selected: {
        strategy: 'concise_kannada',
        text: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭೇಟಿ ನೀಡಬಹುದಾದ 3 ಪ್ರಮುಖ ಪ್ರವಾಸಿ ಸ್ಥಳಗಳ ಮಾಹಿತಿ ನೀಡಿ.',
        tokens: 26,
        similarity_score: 0.93,
        tokens_saved: 22,
        savings_percent: 45.8,
      },
      candidates: [
        {
          strategy: 'original',
          text: prompt,
          tokens: 48,
          similarity: 1.0,
          passed_guard: true,
        },
        {
          strategy: 'concise_kannada',
          text: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭೇಟಿ ನೀಡಬಹುದಾದ 3 ಪ್ರಮುಖ ಪ್ರವಾಸಿ ಸ್ಥಳಗಳ ಮಾಹಿತಿ ನೀಡಿ.',
          tokens: 26,
          similarity: 0.93,
          passed_guard: true,
        },
        {
          strategy: 'structured_kannada',
          text: 'ಬೆಂಗಳೂರಿನ 3 ಮುಖ್ಯ ಪ್ರವಾಸಿ ತಾಣಗಳು: ವಿವರ ಪಟ್ಟಿ.',
          tokens: 29,
          similarity: 0.95,
          passed_guard: true,
        },
        {
          strategy: 'morphological_compact',
          text: 'ಬೆಂಗಳೂರಿನ 3 ಪ್ರವಾಸಿ ಸ್ಥಳ ವಿವರಗಳು ತಿಳಿಸಿ.',
          tokens: 32,
          similarity: 0.9,
          passed_guard: true,
        },
        {
          strategy: 'extreme_trimmed',
          text: 'ಬೆಂಗಳೂರು ಪ್ರವಾಸ 3 ಸ್ಥಳ.',
          tokens: 21,
          similarity: 0.76,
          passed_guard: false,
        },
      ],
      llm_response: `ಬೆಂಗಳೂರಿನಲ್ಲಿ ಭೇಟಿ ನೀಡಲು 3 ಪ್ರಮುಖ ಪ್ರವಾಸಿ ಸ್ಥಳಗಳು:

1. ಲಾಲ್‌ಬಾಗ್ ಬಟಾನಿಕಲ್ ಗಾರ್ಡನ್ (Lalbagh Botanical Garden):
   ಪ್ರಸಿದ್ಧ ಗಾಜಿನ ಮನೆ (Glass House) ಮತ್ತು ಶತಮಾನಗಳ ಹಳೆಯ ಅಪರೂಪದ ಸಸ್ಯ ಸಂಪತ್ತಿಗೆ ಇದು ಅತ್ಯಂತ ಜನಪ್ರಿಯ ತಾಣವಾಗಿದೆ. ವರ್ಷಕ್ಕೊಮ್ಮೆ ನಡೆಯುವ ಫಲಪುಷ್ಪ ಪ್ರದರ್ಶನ ಜಗತ್ಪ್ರಸಿದ್ಧ.

2. ಬೆಂಗಳೂರು ಅರಮನೆ (Bangalore Palace):
   1878 ರಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಈ ಅರಮನೆಯು ಸುಂದರವಾದ ಟ್ಯೂಡರ್ ಶೈಲಿಯ ವಾಸ್ತುಶಿಲ್ಪ, ಮರಗೆಲಸಗಳು ಮತ್ತು ರಾಜಮನೆತನದ ಭವ್ಯ ಇತಿಹಾಸವನ್ನು ಅನಾವರಣಗೊಳಿಸುತ್ತದೆ.

3. ಕಬ್ಬನ್ ಪಾರ್ಕ್ (Cubbon Park):
   ನಗರದ ಹೃದಯಭಾಗದಲ್ಲಿ 300 ಕ್ಕೂ ಹೆಚ್ಚು ಎಕರೆ ಪ್ರದೇಶದಲ್ಲಿ ಹರಡಿರುವ ಹಸಿರು ವನ. ಶಾಂತ ವಾತಾವರಣ, ವಾಯುವಿಹಾರ ಮತ್ತು ಹಸಿರು ಪರಿಸರಕ್ಕೆ ಇದು ಹೇಳಿಮಾಡಿಸಿದ ಸ್ಥಳ.`,
      metrics: {
        optimization_latency_ms: 78,
        llm_latency_ms: 1120,
        total_latency_ms: 1198,
        output_tokens: 74,
      },
    };
  }

  // Preset 2: Polite Tech (contains "ಪೈಥಾನ್" or "Python")
  if (trimmed.includes('ಪೈಥಾನ್') || trimmed.toLowerCase().includes('python')) {
    return {
      original: {
        text: prompt,
        tokens: 52,
      },
      selected: {
        strategy: 'structured_kannada',
        text: 'ಪೈಥಾನ್ (Python) ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಕಲಿಯಲು 4 ಮುಖ್ಯ ಹಂತಗಳು ತಿಳಿಸಿ.',
        tokens: 28,
        similarity_score: 0.91,
        tokens_saved: 24,
        savings_percent: 46.2,
      },
      candidates: [
        {
          strategy: 'original',
          text: prompt,
          tokens: 52,
          similarity: 1.0,
          passed_guard: true,
        },
        {
          strategy: 'structured_kannada',
          text: 'ಪೈಥಾನ್ (Python) ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಕಲಿಯಲು 4 ಮುಖ್ಯ ಹಂತಗಳು ತಿಳಿಸಿ.',
          tokens: 28,
          similarity: 0.91,
          passed_guard: true,
        },
        {
          strategy: 'concise_kannada',
          text: 'ಪೈಥಾನ್ ಕಲಿಯುವ 4 ಹಂತಗಳು ಯಾವುವು?',
          tokens: 30,
          similarity: 0.89,
          passed_guard: true,
        },
        {
          strategy: 'morphological_compact',
          text: 'ಪೈಥಾನ್ ಭಾಷಾ ಕಲಿಕೆಗೆ 4 ಹಂತ ವಿವರ.',
          tokens: 34,
          similarity: 0.93,
          passed_guard: true,
        },
        {
          strategy: 'phonetic_romanized',
          text: 'Python kaliyalu 4 steps heliri.',
          tokens: 24,
          similarity: 0.72,
          passed_guard: false,
        },
      ],
      llm_response: `ಪೈಥಾನ್ (Python) ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಭಾಷೆಯನ್ನು ಪರಿಣಾಮಕಾರಿಯಾಗಿ ಕಲಿಯಲು 4 ಮುಖ್ಯ ಹಂತಗಳು:

1. ಮೂಲ ಪರಿಕಲ್ಪನೆಗಳ ಗ್ರಹಿಕೆ (Syntax & Core Basics):
   ವೇರಿಯಬಲ್‌ಗಳು (Variables), ಡೇಟಾ ವಿಧಗಳು (Data Types - int, str, float), ಮತ್ತು ಆಪರೇಟರ್‌ಗಳೊಂದಿಗೆ ಕೋಡಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ.

2. ನಿಯಂತ್ರಣ ರಚನೆಗಳು ಮತ್ತು ಫಂಕ್ಷನ್‌ಗಳು (Control Flow & Functions):
   if-elif-else ಷರತ್ತುಗಳು, for ಮತ್ತು while ಲೂಪ್‌ಗಳು ಹಾಗೂ ಮರುಬಳಕೆ ಮಾಡಬಹುದಾದ functions ಬರೆಯುವುದನ್ನು ಕರಗತ ಮಾಡಿಕೊಳ್ಳಿ.

3. ಡೇಟಾ ರಚನೆಗಳು ಮತ್ತು ವಸ್ತು-ಆಧಾರಿತ ಪ್ರೋಗ್ರಾಮಿಂಗ್ (Data Structures & OOP):
   Lists, Tuples, Dictionaries, Sets ಹಾಗೂ Object-Oriented Programming (Classes & Objects) ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ.

4. ನೈಜ ಯೋಜನೆಗಳ ನಿರ್ಮಾಣ (Hands-on Projects):
   ಚಿಕ್ಕ ಕ್ಯಾಲ್ಕುಲೇಟರ್, ವೆಬ್ ಸ್ಕ್ರಾಪಿಂಗ್ (BeautifulSoup) ಅಥವಾ ಸರಳ REST API (FastAPI) ನಿರ್ಮಿಸುವ ಮೂಲಕ ಪ್ರಾಯೋಗಿಕ ಜ್ಞಾನ ಗಳಿಸಿ.`,
      metrics: {
        optimization_latency_ms: 84,
        llm_latency_ms: 1240,
        total_latency_ms: 1324,
        output_tokens: 88,
      },
    };
  }

  // Preset 3 / Short queries (length < 35 chars)
  if (trimmed.length < 35) {
    return {
      original: {
        text: prompt,
        tokens: 12,
      },
      selected: {
        strategy: 'original',
        text: prompt,
        tokens: 12,
        similarity_score: 1.0,
        tokens_saved: 0,
        savings_percent: 0,
      },
      candidates: [
        {
          strategy: 'original',
          text: prompt,
          tokens: 12,
          similarity: 1.0,
          passed_guard: true,
        },
        {
          strategy: 'concise_kannada',
          text: 'ಕರ್ನಾಟಕ ರಾಜಧಾನಿ?',
          tokens: 7,
          similarity: 0.74,
          passed_guard: false,
        },
        {
          strategy: 'structured_kannada',
          text: 'ಕರ್ನಾಟಕದ ರಾಜಧಾನಿ:',
          tokens: 9,
          similarity: 0.81,
          passed_guard: false,
        },
        {
          strategy: 'morphological_compact',
          text: 'ಕರ್ನಾಟಕ ರಾಜಧಾನಿ ಯಾವುದು',
          tokens: 10,
          similarity: 0.88,
          passed_guard: true,
        },
        {
          strategy: 'normalized_raw',
          text: prompt,
          tokens: 12,
          similarity: 1.0,
          passed_guard: true,
        },
      ],
      llm_response: 'ಕರ್ನಾಟಕದ ರಾಜಧಾನಿ ಬೆಂಗಳೂರು.',
      metrics: {
        optimization_latency_ms: 41,
        llm_latency_ms: 610,
        total_latency_ms: 651,
        output_tokens: 14,
      },
    };
  }

  // Fallback for custom long Kannada prompts
  const originalTokens = Math.max(16, Math.round(trimmed.length * 0.85));
  const optimizedTokens = Math.round(originalTokens * 0.58);
  const saved = originalTokens - optimizedTokens;
  const pct = Math.round((saved / originalTokens) * 1000) / 10;

  return {
    original: {
      text: prompt,
      tokens: originalTokens,
    },
    selected: {
      strategy: 'concise_kannada',
      text: prompt.slice(0, Math.round(prompt.length * 0.65)).trim() + '.',
      tokens: optimizedTokens,
      similarity_score: 0.92,
      tokens_saved: saved,
      savings_percent: pct,
    },
    candidates: [
      {
        strategy: 'original',
        text: prompt,
        tokens: originalTokens,
        similarity: 1.0,
        passed_guard: true,
      },
      {
        strategy: 'concise_kannada',
        text: prompt.slice(0, Math.round(prompt.length * 0.65)).trim() + '.',
        tokens: optimizedTokens,
        similarity: 0.92,
        passed_guard: true,
      },
      {
        strategy: 'structured_kannada',
        text: prompt.slice(0, Math.round(prompt.length * 0.72)).trim(),
        tokens: Math.round(originalTokens * 0.68),
        similarity: 0.94,
        passed_guard: true,
      },
      {
        strategy: 'morphological_compact',
        text: prompt.slice(0, Math.round(prompt.length * 0.8)).trim(),
        tokens: Math.round(originalTokens * 0.78),
        similarity: 0.96,
        passed_guard: true,
      },
      {
        strategy: 'aggressive_trimmed',
        text: prompt.slice(0, Math.round(prompt.length * 0.4)).trim(),
        tokens: Math.round(originalTokens * 0.45),
        similarity: 0.68,
        passed_guard: false,
      },
    ],
    llm_response: `ನಿಮ್ಮ ಪ್ರಾಂಪ್ಟ್‌ಗೆ ಸಂಬಂಧಿಸಿದಂತೆ Gemini ಮಾದರಿಯ ಸಾರಾಂಶ ಉತ್ತರ:\n\n1. ಮುಖ್ಯ ವಿಷಯದ ಸ್ಪಷ್ಟೀಕರಣ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ ನೀಡಲಾಗಿದೆ.\n2. ಕನಿಷ್ಠ ಟೋಕನ್‌ಗಳೊಂದಿಗೆ ಗರಿಷ್ಠ ನಿಖರತೆಯನ್ನು ಕಾಯ್ದುಕೊಳ್ಳಲಾಗಿದೆ.`,
    metrics: {
      optimization_latency_ms: 72,
      llm_latency_ms: 1050,
      total_latency_ms: 1122,
      output_tokens: 65,
    },
  };
}
