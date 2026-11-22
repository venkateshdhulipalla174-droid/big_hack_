import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { BarChart2, Table, ChevronDown, ChevronRight, CheckCircle2, XCircle, Award } from 'lucide-react';
import { KSmartResponse } from '../types/ksmart';

interface CandidateAnalyticsProps {
  data: KSmartResponse;
}

interface ChartItem {
  strategy: string;
  formattedStrategy: string;
  tokens: number;
  similarity: number;
  passed_guard: boolean;
  is_selected: boolean;
}

const formatStrategyName = (strategy: string): string => {
  switch (strategy) {
    case 'original':
      return 'Original';
    case 'concise_kannada':
      return 'Concise Kannada';
    case 'structured_kannada':
      return 'Structured';
    case 'morphological_compact':
      return 'Morphological';
    case 'extreme_trimmed':
      return 'Extreme Trimmed';
    case 'phonetic_romanized':
      return 'English Trans.';
    case 'normalized_raw':
      return 'Normalized';
    case 'aggressive_trimmed':
      return 'Aggressive Trim';
    default:
      return strategy
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartItem;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload;
    return (
      <div className="bg-zinc-950 border border-zinc-700 text-zinc-100 rounded-lg px-3 py-2 text-xs shadow-xl space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
          <span>{item.formattedStrategy}</span>
          {item.is_selected && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">
              Winner
            </span>
          )}
        </div>
        <div className="text-zinc-400">
          Tokens: <span className="font-mono font-bold text-zinc-100">{item.tokens}</span>
        </div>
        <div className="text-zinc-400">
          Similarity:{' '}
          <span className="font-mono font-bold text-emerald-400">
            {(item.similarity * 100).toFixed(0)}%
          </span>
        </div>
        <div className="text-zinc-400">
          Guard:{' '}
          <span className={item.passed_guard ? 'text-emerald-400' : 'text-rose-400'}>
            {item.passed_guard ? 'Passed' : 'Rejected'}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const CandidateAnalytics: React.FC<CandidateAnalyticsProps> = ({ data }) => {
  const { candidates, selected } = data;
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (strategy: string) => {
    setExpandedRow((prev) => (prev === strategy ? null : strategy));
  };

  const chartData: ChartItem[] = candidates.map((c) => ({
    strategy: c.strategy,
    formattedStrategy: formatStrategyName(c.strategy),
    tokens: c.tokens,
    similarity: c.similarity,
    passed_guard: c.passed_guard,
    is_selected: c.strategy === selected.strategy,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Card: Token Count by Representation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                Token Count by Representation
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">Vertical Token Dist.</span>
          </div>

          {/* Recharts Horizontal Bar Chart */}
          <div className="w-full h-[260px] min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  stroke="#71717a"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickLine={{ stroke: '#3f3f46' }}
                />
                <YAxis
                  type="category"
                  dataKey="formattedStrategy"
                  stroke="#a1a1aa"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tokens" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {chartData.map((entry, index) => {
                    let fill = '#52525b'; // Passed guard
                    if (entry.is_selected) {
                      fill = '#6366f1'; // Selected winning strategy
                    } else if (!entry.passed_guard) {
                      fill = '#f43f5e'; // Rejected by guard
                    }
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compact 3-dot Legend Below the Chart */}
        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
            <span className="text-zinc-300">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#52525b]" />
            <span>Passed Guard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
            <span>Rejected by Guard</span>
          </div>
        </div>
      </div>

      {/* Right Card: Candidate Evaluation Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 overflow-x-auto shadow-xl shadow-black/20 flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                <Table className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                Candidate Evaluation Table
              </h3>
            </div>
            <span className="text-[11px] text-zinc-500">Click row to preview text</span>
          </div>

          {/* Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-medium">
                <th className="py-2.5 px-3">Strategy</th>
                <th className="py-2.5 px-3 font-mono">Tokens</th>
                <th className="py-2.5 px-3 font-mono">Similarity</th>
                <th className="py-2.5 px-3 text-right">Guard Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {candidates.map((c) => {
                const isWinner = c.strategy === selected.strategy;
                const isExpanded = expandedRow === c.strategy;

                return (
                  <React.Fragment key={c.strategy}>
                    <tr
                      onClick={() => toggleRow(c.strategy)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isWinner
                          ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500 hover:bg-indigo-500/15'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Strategy */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </span>
                          <span
                            className={`font-medium ${
                              isWinner ? 'text-indigo-300' : 'text-zinc-200'
                            }`}
                          >
                            {formatStrategyName(c.strategy)}
                          </span>
                          {isWinner && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                              <Award className="w-2.5 h-2.5" />
                              Winner
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tokens */}
                      <td className="py-2.5 px-3 font-mono font-medium text-zinc-300">
                        {c.tokens}
                      </td>

                      {/* Similarity */}
                      <td className="py-2.5 px-3 font-mono text-zinc-300">
                        <span
                          className={
                            c.similarity >= 0.85 ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {(c.similarity * 100).toFixed(0)}%
                        </span>
                      </td>

                      {/* Guard Status */}
                      <td className="py-2.5 px-3 text-right">
                        {c.passed_guard ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expandable row displaying candidate exact text */}
                    {isExpanded && (
                      <tr className="bg-zinc-950/70">
                        <td colSpan={4} className="p-3 border-b border-zinc-800">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                              <span>Candidate Representation Text:</span>
                              <span>
                                {c.tokens} tokens • {c.text.length} characters
                              </span>
                            </div>
                            <p className="text-xs text-zinc-200 font-sans leading-relaxed bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 selection:bg-indigo-500/30">
                              {c.text}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <div className="mt-3 pt-2 text-[11px] text-zinc-500 flex items-center justify-between border-t border-zinc-800/60">
          <span>Semantic Guard Threshold: &ge; 85%</span>
          <span>Click any row to reveal prompt text</span>
        </div>
      </div>
    </div>
  );
};
