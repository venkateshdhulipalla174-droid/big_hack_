export interface Candidate {
  strategy: string;
  text: string;
  tokens: number;
  similarity: number;
  passed_guard: boolean;
}

export interface KSmartResponse {
  original: {
    text: string;
    tokens: number;
  };
  selected: {
    strategy: string;
    text: string;
    tokens: number;
    similarity_score: number;
    tokens_saved: number;
    savings_percent: number;
  };
  candidates: Candidate[];
  llm_response: string;
  metrics: {
    optimization_latency_ms: number;
    llm_latency_ms: number;
    total_latency_ms: number;
    output_tokens: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  ksmartData?: KSmartResponse;
  mode?: string;
}
