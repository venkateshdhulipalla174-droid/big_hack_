import React from 'react';
import {
  FileText,
  Cpu,
  TrendingDown,
  Zap,
  Bot,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import { KSmartResponse } from '../types/ksmart';

interface AchievementMetricsProps {
  data: KSmartResponse;
}

export const AchievementMetrics: React.FC<AchievementMetricsProps> = ({ data }) => {
  const { original, selected, metrics } = data;

  const ksmartPercent =
    metrics.total_latency_ms > 0
      ? ((metrics.optimization_latency_ms / metrics.total_latency_ms) * 100).toFixed(1)
      : '0.0';

  const cards = [
    {
      label: 'Original Tokens',
      value: original.tokens,
      valueClass: 'text-zinc-300 text-2xl font-bold',
      subtext: 'Baseline input',
      icon: <FileText className="w-4 h-4 text-zinc-500" />,
    },
    {
      label: 'Optimized Tokens',
      value: selected.tokens,
      valueClass: 'text-indigo-400 text-2xl font-bold',
      subtext: selected.strategy,
      icon: <Cpu className="w-4 h-4 text-indigo-400" />,
    },
    {
      label: 'Tokens Saved',
      value: `${selected.savings_percent.toFixed(1)}%`,
      valueClass: 'text-emerald-400 text-2xl font-bold',
      subtext: `-${selected.tokens_saved} tokens`,
      icon: <TrendingDown className="w-4 h-4 text-emerald-400" />,
    },
    {
      label: 'Processing Time',
      value: `${metrics.optimization_latency_ms} ms`,
      valueClass: 'text-sky-400 text-2xl font-bold',
      subtext: 'K-SMART engine',
      icon: <Zap className="w-4 h-4 text-sky-400" />,
    },
    {
      label: 'LLM Response Time',
      value: `${(metrics.llm_latency_ms / 1000).toFixed(2)} s`,
      valueClass: 'text-violet-400 text-2xl font-bold',
      subtext: `${metrics.llm_latency_ms} ms Gemini`,
      icon: <Bot className="w-4 h-4 text-violet-400" />,
    },
    {
      label: 'Total Overhead',
      value: `${(metrics.total_latency_ms / 1000).toFixed(2)} s`,
      valueClass: 'text-white text-2xl font-bold',
      subtext: `Total (${ksmartPercent}% K-SMART)`,
      icon: <Timer className="w-4 h-4 text-zinc-400" />,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Title Header with Emerald Similarity Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-200 flex items-center gap-2">
          <span>K-SMART Measurable Impact</span>
        </h3>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Meaning Similarity: {(selected.similarity_score * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* 6-Card Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-md shadow-black/20 hover:border-zinc-700/80 transition-all duration-200 group"
          >
            {/* Top Row: Label and Icon */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-xs text-zinc-400 font-medium truncate">{card.label}</span>
              <div className="p-1 rounded bg-zinc-950/60 border border-zinc-800/80 group-hover:border-zinc-700 transition-colors">
                {card.icon}
              </div>
            </div>

            {/* Middle: Value */}
            <div className="my-1">
              <span className={`${card.valueClass} font-mono tracking-tight block`}>
                {card.value}
              </span>
            </div>

            {/* Bottom: Subtext */}
            <div className="mt-1 pt-2 border-t border-zinc-800/60">
              <span className="text-[11px] text-zinc-500 truncate block font-mono">
                {card.subtext}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
