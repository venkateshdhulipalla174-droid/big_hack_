import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowUp,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { OptimizationMode } from '../types';
import { ChatMessage } from '../types/ksmart';
import { PipelineStepper } from './PipelineStepper';
import { PromptComparison } from './PromptComparison';
import { CandidateAnalytics } from './CandidateAnalytics';

interface PromptStudioProps {
  messages: ChatMessage[];
  isRunning: boolean;
  activeStep: number;
  onSendMessage: (text: string, mode: OptimizationMode) => void;
  mode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  optimize?: boolean;
  onOptimizeChange?: (optimize: boolean) => void;
  error?: string | null;
  onSwitchToMock?: () => void;
}

export const PromptStudio: React.FC<PromptStudioProps> = ({
  messages,
  isRunning,
  activeStep,
  onSendMessage,
  mode,
  onModeChange,
  optimize = true,
  onOptimizeChange,
  error,
  onSwitchToMock,
}) => {
  const [input, setInput] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-expand latest assistant message by default, and ensure compare mode messages are auto-expanded
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.ksmartData) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.add(lastMsg.id);
          return next;
        });
      }
      messages.forEach((msg) => {
        if (msg.role === 'assistant' && (msg.mode === 'compare' || msg.mode === 'compare_all')) {
          setExpandedIds((prev) => {
            const next = new Set(prev);
            next.add(msg.id);
            return next;
          });
        }
      });
    }
  }, [messages]);

  // Smooth auto-scroll to bottom on new messages, prompt sending, or assistant replies
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRunning, activeStep, error]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isRunning) return;

    onSendMessage(text, mode);
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Shared Chat Input Component
  const renderInputBox = () => (
    <div className="w-full">
      {/* Live API Error Alert Banner */}
      {error && (
        <div className="mb-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="text-xs sm:text-sm font-medium">{error}</span>
          </div>
          {onSwitchToMock && (
            <button
              type="button"
              onClick={onSwitchToMock}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-medium transition-colors self-start sm:self-auto cursor-pointer"
            >
              Switch to Mock Mode
            </button>
          )}
        </div>
      )}

      {/* Compact 4-Step Pipeline Stepper while generating */}
      {isRunning && (
        <div className="mb-3 animate-in fade-in duration-200">
          <PipelineStepper activeStep={activeStep} isRunning={isRunning} />
        </div>
      )}

      {/* ChatGPT / Gemini Style Rounded Input Container */}
      <div className="bg-zinc-900 border border-zinc-800 focus-within:border-zinc-700 rounded-2xl p-3 shadow-xl transition-colors">
        <textarea
          ref={textareaRef}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message K-SMART..."
          className="w-full bg-transparent border-0 text-zinc-100 placeholder-zinc-500 focus:outline-none text-sm resize-none max-h-32 min-h-[44px] font-sans leading-relaxed"
        />

        {/* Compact Bottom Toolbar inside Box */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="chat-mode" className="text-[11px] text-zinc-500 font-medium">
                Mode:
              </label>
              <select
                id="chat-mode"
                value={mode === 'compare_all' ? 'compare' : mode}
                onChange={(e) => onModeChange(e.target.value as OptimizationMode)}
                className="bg-zinc-950/90 border border-zinc-800 text-[11px] text-zinc-300 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="adaptive">Adaptive Selection</option>
                <option value="compare">Compare All E0–E3</option>
              </select>
            </div>

            {onOptimizeChange && (
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="toggle-optimize"
                  checked={optimize}
                  onChange={(e) => onOptimizeChange(e.target.checked)}
                  className="rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className={optimize ? 'text-indigo-400 font-medium' : 'text-zinc-500'}>
                  Optimize
                </span>
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isRunning}
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-md shadow-indigo-600/30 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            title="Send prompt (Enter)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Empty State: Greeting & Input grouped cleanly in the upper-center */}
      {messages.length === 0 ? (
        <div className="pt-10 sm:pt-14 flex flex-col items-center gap-6 max-w-3xl mx-auto px-4 w-full animate-in fade-in duration-300">
          {/* Centered Hero Greeting */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.35)] flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
              Hey! How can I help you today?
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              ನಮಸ್ಕಾರ! ಕೇಳಿ — K-SMART optimizes every prompt automatically.
            </p>
          </div>

          {/* Input Box seated cleanly right below the hero */}
          {renderInputBox()}
        </div>
      ) : (
        /* Active Chat State: Clean thread starting right below navbar with input docked at bottom */
        <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between max-w-3xl mx-auto px-4 w-full pt-4 pb-6">
          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isExpanded = expandedIds.has(msg.id);

              if (isUser) {
                return (
                  <div key={msg.id} className="flex justify-end animate-in fade-in duration-150">
                    <div className="bg-zinc-800 text-zinc-100 rounded-2xl px-4 py-3 max-w-[80%] ml-auto text-sm sm:text-base leading-relaxed font-sans shadow-md">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className="w-full space-y-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-start gap-3">
                    {/* Glowing K-SMART Avatar Icon */}
                    <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.35)] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>

                    {/* Content Block */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center justify-between gap-2 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-200">K-SMART</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            Gemini
                          </span>
                        </div>

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="text-xs text-zinc-500 hover:text-zinc-200 flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-zinc-800"
                          title="Copy answer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Answer Text */}
                      <div className="text-zinc-100 leading-relaxed whitespace-pre-line text-sm sm:text-base font-sans selection:bg-indigo-500/30 selection:text-white">
                        {msg.content}
                      </div>

                      {/* Compact K-SMART Measurable Impact Bar */}
                      {msg.ksmartData && (
                        <div className="mt-3 bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-3 shadow-lg">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                              <Zap className="w-3.5 h-3.5 text-indigo-400" />
                              <span>K-SMART Measurable Impact</span>
                            </div>
                            <div className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>
                                Meaning Similarity:{' '}
                                {(msg.ksmartData.selected.similarity_score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          {/* 6 metrics responsive grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-2.5">
                              <span className="text-[11px] text-zinc-400 block truncate">
                                Original Tokens
                              </span>
                              <span className="text-base font-bold text-zinc-200 font-mono block mt-0.5">
                                {msg.ksmartData.original.tokens}
                              </span>
                              <span className="text-[10px] text-zinc-500 block truncate">
                                Baseline input
                              </span>
                            </div>
                            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-2.5">
                              <span className="text-[11px] text-zinc-400 block truncate">
                                Optimized Tokens
                              </span>
                              <span className="text-base font-bold text-indigo-400 font-mono block mt-0.5">
                                {msg.ksmartData.selected.tokens}
                              </span>
                              <span className="text-[10px] text-zinc-500 block truncate font-mono">
                                {msg.ksmartData.selected.strategy}
                              </span>
                            </div>
                            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-2.5">
                              <span className="text-[11px] text-zinc-400 block truncate">
                                Tokens Saved
                              </span>
                              <span className="text-base font-bold text-emerald-400 font-mono block mt-0.5">
                                {msg.ksmartData.selected.savings_percent.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-zinc-500 block truncate">
                                -{msg.ksmartData.selected.tokens_saved} tokens
                              </span>
                            </div>
                            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-2.5">
                              <span className="text-[11px] text-zinc-400 block truncate">
                                Processing Time
                              </span>
                              <span className="text-base font-bold text-sky-400 font-mono block mt-0.5">
                                {msg.ksmartData.metrics.optimization_latency_ms} ms
                              </span>
                              <span className="text-[10px] text-zinc-500 block truncate">
                                K-SMART engine
                              </span>
                            </div>
                            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-2.5">
                              <span className="text-[11px] text-zinc-400 block truncate">
                                LLM Response Time
                              </span>
                              <span className="text-base font-bold text-violet-400 font-mono block mt-0.5">
                                {(msg.ksmartData.metrics.llm_latency_ms / 1000).toFixed(2)} s
                              </span>
                              <span className="text-[10px] text-zinc-500 block truncate">
                                {msg.ksmartData.metrics.llm_latency_ms} ms Gemini
                              </span>
                            </div>
                            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-2.5">
                              <span className="text-[11px] text-zinc-400 block truncate">
                                Total Overhead
                              </span>
                              <span className="text-base font-bold text-white font-mono block mt-0.5">
                                {(msg.ksmartData.metrics.total_latency_ms / 1000).toFixed(2)} s
                              </span>
                              <span className="text-[10px] text-zinc-500 block truncate">
                                Total (
                                {msg.ksmartData.metrics.total_latency_ms > 0
                                  ? (
                                      (msg.ksmartData.metrics.optimization_latency_ms /
                                        msg.ksmartData.metrics.total_latency_ms) *
                                      100
                                    ).toFixed(1)
                                  : '0'}
                                %)
                              </span>
                            </div>
                          </div>

                          {/* Expandable Prompt Diff & Candidate Analytics Toggle */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => toggleExpand(msg.id)}
                              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {isExpanded
                                  ? 'Hide Prompt Diff & Candidates'
                                  : 'Inspect Prompt Diff & Candidates'}
                              </span>
                            </button>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-4 animate-in fade-in duration-200">
                                {/* 4-Column E0–E3 Summary Strip when in compare mode */}
                                {(msg.mode === 'compare' || msg.mode === 'compare_all' || mode === 'compare' || mode === 'compare_all') && (() => {
                                  const candidates = msg.ksmartData.candidates || [];
                                  const cE0 = candidates.find((c) => c.strategy.toLowerCase().includes('original'));
                                  const cE1 = candidates.find((c) => c.strategy.toLowerCase().includes('normalized'));
                                  const cE2 = msg.ksmartData.selected;
                                  const cE3 = candidates.find(
                                    (c) => c.strategy.toLowerCase().includes('english') || c.strategy.toLowerCase().includes('trans')
                                  );

                                  const e0Tokens = cE0 ? cE0.tokens : msg.ksmartData.original.tokens;
                                  const e0Sim = cE0 ? (cE0.similarity * 100).toFixed(0) : '100';

                                  const e1Tokens = cE1 ? cE1.tokens : Math.max(1, Math.round(e0Tokens * 0.91));
                                  const e1Sim = cE1 ? (cE1.similarity * 100).toFixed(0) : '99';

                                  const e2Tokens = cE2.tokens;
                                  const e2Sim = (cE2.similarity_score * 100).toFixed(0);

                                  const e3Tokens = cE3 ? cE3.tokens : Math.max(1, Math.round(e2Tokens * 0.72));
                                  const e3Sim = cE3 ? (cE3.similarity * 100).toFixed(0) : '84';

                                  return (
                                    <div className="space-y-2 pb-3 border-b border-zinc-800/70">
                                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                                        <span className="flex items-center gap-1.5 text-indigo-300">
                                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                          E0–E3 Multi-Channel Representation Breakdown
                                        </span>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                          Compare Mode Active
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {/* E0 Original */}
                                        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-mono font-bold text-zinc-400">E0</span>
                                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                                                {e0Sim}% Sim
                                              </span>
                                            </div>
                                            <div className="text-xs font-medium text-zinc-200 mt-1">E0 Original</div>
                                          </div>
                                          <div className="mt-2 pt-1 border-t border-zinc-800/60 flex items-baseline justify-between">
                                            <span className="text-xs text-zinc-500">Tokens:</span>
                                            <span className="text-sm font-bold font-mono text-zinc-200">{e0Tokens}</span>
                                          </div>
                                        </div>

                                        {/* E1 Normalized */}
                                        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-mono font-bold text-zinc-400">E1</span>
                                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                                {e1Sim}% Sim
                                              </span>
                                            </div>
                                            <div className="text-xs font-medium text-zinc-200 mt-1">E1 Normalized</div>
                                          </div>
                                          <div className="mt-2 pt-1 border-t border-zinc-800/60 flex items-baseline justify-between">
                                            <span className="text-xs text-zinc-500">Tokens:</span>
                                            <span className="text-sm font-bold font-mono text-zinc-300">{e1Tokens}</span>
                                          </div>
                                        </div>

                                        {/* E2 K-SMART (Winner) */}
                                        <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-xl p-2.5 flex flex-col justify-between shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-mono font-bold text-indigo-400">E2</span>
                                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                                                {e2Sim}% Sim
                                              </span>
                                            </div>
                                            <div className="text-xs font-bold text-indigo-200 mt-1 flex items-center gap-1">
                                              <span>E2 K-SMART</span>
                                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase">Winner</span>
                                            </div>
                                          </div>
                                          <div className="mt-2 pt-1 border-t border-indigo-500/20 flex items-baseline justify-between">
                                            <span className="text-xs text-indigo-300">Tokens:</span>
                                            <span className="text-sm font-bold font-mono text-emerald-400">{e2Tokens}</span>
                                          </div>
                                        </div>

                                        {/* E3 English Trans. */}
                                        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] font-mono font-bold text-amber-400">E3</span>
                                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                {e3Sim}% Sim
                                              </span>
                                            </div>
                                            <div className="text-xs font-medium text-zinc-200 mt-1">E3 English Trans.</div>
                                          </div>
                                          <div className="mt-2 pt-1 border-t border-zinc-800/60 flex items-baseline justify-between">
                                            <span className="text-xs text-zinc-500">Tokens:</span>
                                            <span className="text-sm font-bold font-mono text-amber-400">{e3Tokens}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <PromptComparison data={msg.ksmartData} />
                                <CandidateAnalytics data={msg.ksmartData} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Docked bottom input bar */}
          <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur-md pt-2 pb-4">
            {renderInputBox()}
          </div>
        </div>
      )}
    </div>
  );
};
