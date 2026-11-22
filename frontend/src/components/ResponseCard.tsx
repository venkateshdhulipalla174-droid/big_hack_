import React, { useState } from 'react';
import { Sparkles, Copy, Check, Bot } from 'lucide-react';

interface ResponseCardProps {
  response: string;
  outputTokens: number;
}

export const ResponseCard: React.FC<ResponseCardProps> = ({ response, outputTokens }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 border-t-2 border-t-indigo-500/70 rounded-2xl p-6 shadow-xl shadow-black/25">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
              Gemini Kannada Response{' '}
              <span className="text-zinc-400 font-normal text-xs">(ಕನ್ನಡ ಉತ್ತರ)</span>
            </h3>
          </div>
        </div>

        {/* Badges + Copy-to-Clipboard Button */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
            <Bot className="w-3.5 h-3.5 text-zinc-400" />
            Model: Gemini
          </span>

          <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
            Output: <strong className="text-indigo-400 font-semibold">{outputTokens}</strong> tokens
          </span>

          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-medium transition-all duration-150 ${
              copied
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                : 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border-zinc-700/70 hover:text-white'
            }`}
            title="Copy response to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body: Kannada Script Rendered Cleanly */}
      <div className="mt-4 pt-1">
        <p className="whitespace-pre-line leading-relaxed text-zinc-100 text-base font-sans selection:bg-indigo-500/40 selection:text-white">
          {response}
        </p>
      </div>
    </div>
  );
};
