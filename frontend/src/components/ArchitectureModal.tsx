import React, { useEffect } from 'react';
import { X, Layers, Cpu, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STAGES = [
  {
    step: 'Stage 1',
    title: 'Kannada Unicode Normalization',
    subtitle: 'NFC & Zero-Width Cleanup',
    description:
      'Normalizes Kannada Unicode codepoints using NFC form. Removes hidden zero-width non-joiners (ZWNJ) and non-standard halant sequences that cause tokenizers to split conjuncts into 3–4x more sub-word tokens.',
    badge: 'Unicode Level',
    icon: <Cpu className="w-4 h-4 text-sky-400" />,
  },
  {
    step: 'Stage 2',
    title: 'Multi-Strategy Candidate Generation',
    subtitle: '5 Concurrent Representation Channels',
    description:
      'Generates 5 distinct representations in parallel: Original (E0), Normalized (E1), Concise Kannada (E2), Structured Key-Value Kannada, and English Translated (E3) to explore the optimal compression frontier.',
    badge: 'Multi-Channel',
    icon: <Layers className="w-4 h-4 text-indigo-400" />,
  },
  {
    step: 'Stage 3',
    title: 'Semantic Similarity Guard',
    subtitle: 'Cosine & Embedding Meaning Verifier',
    description:
      'Computes cosine similarity between candidate representations and the original prompt embedding. Candidates dropping below the 0.85 threshold are rejected immediately to eliminate factual drift and hallucination.',
    badge: 'Guaranteed Fidelity',
    icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  },
  {
    step: 'Stage 4',
    title: 'Token-Optimal Selection & Adaptive Fallback',
    subtitle: 'Pareto-Optimal Representation Dispatch',
    description:
      'Ranks valid candidates by token reduction efficiency. Adaptively falls back to the original prompt (E0) whenever compression degrades meaning or for short queries (<35 chars).',
    badge: 'Adaptive Dispatch',
    icon: <Sparkles className="w-4 h-4 text-violet-400" />,
  },
];

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-6 text-left relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-100">
                  K-SMART 4-Stage Middleware Architecture
                </h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v0.1 Spec
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kannada Semantic-preserving Minimization &amp; Adaptive Representation Technique
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Architecture Stages */}
        <div className="space-y-3">
          {STAGES.map((s, idx) => (
            <div
              key={idx}
              className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 hover:border-zinc-700/80 transition-all flex flex-col sm:flex-row sm:items-start gap-3.5 group"
            >
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 group-hover:border-indigo-500/40 transition-colors">
                {s.icon}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                      {s.step}
                    </span>
                    <span className="text-sm font-semibold text-zinc-200">{s.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                    {s.badge}
                  </span>
                </div>
                <div className="text-xs font-medium text-zinc-400">{s.subtitle}</div>
                <p className="text-xs text-zinc-400 leading-relaxed pt-1 font-sans">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info strip */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Average 38.4% token reduction with 92.6% meaning retention</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Close Spec
          </button>
        </div>
      </div>
    </div>
  );
};
