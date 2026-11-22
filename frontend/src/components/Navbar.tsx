import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Plus, X } from 'lucide-react';
import { TabType } from '../types';
import { getApiBaseUrl, setApiBaseUrl } from '../services/api';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  mockMode: boolean;
  onToggleMockMode: () => void;
  hasMessages?: boolean;
  onNewChat?: () => void;
  sessionOriginalTokens?: number;
  sessionSavedTokens?: number;
  onOpenArchitecture?: () => void;
  apiStatus?: 'connected' | 'offline' | null;
  onRecheckHealth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  mockMode,
  onToggleMockMode,
  hasMessages = false,
  onNewChat,
  sessionOriginalTokens = 0,
  sessionSavedTokens = 0,
  onOpenArchitecture,
  apiStatus,
  onRecheckHealth,
}) => {
  const [isUrlPopoverOpen, setIsUrlPopoverOpen] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>(() => getApiBaseUrl());
  const popoverRef = useRef<HTMLDivElement>(null);

  const sessionPercent =
    sessionOriginalTokens > 0
      ? ((sessionSavedTokens / sessionOriginalTokens) * 100).toFixed(1)
      : '0.0';

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsUrlPopoverOpen(false);
      }
    };
    if (isUrlPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUrlPopoverOpen]);

  const handleTogglePopover = () => {
    setUrlInput(getApiBaseUrl());
    setIsUrlPopoverOpen((prev) => !prev);
  };

  const handleSaveAndRecheck = () => {
    setApiBaseUrl(urlInput);
    setIsUrlPopoverOpen(false);
    if (onRecheckHealth) {
      onRecheckHealth();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Glowing Indigo Sparkles + Title + Clickable V0.1 Badge */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.4)]">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-100">
              K-SMART
            </span>
            <button
              type="button"
              onClick={onOpenArchitecture}
              className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/20 font-mono transition cursor-pointer shadow-sm"
              title="Click to view K-SMART 4-Stage Architecture Spec"
            >
              V0.1
            </button>
          </div>
        </div>

        {/* Center: Pill Tab Switcher */}
        <div className="flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-full shadow-inner">
          <button
            type="button"
            onClick={() => onTabChange('playground')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              activeTab === 'playground'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Live Playground
          </button>
          <button
            type="button"
            onClick={() => onTabChange('benchmark')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              activeTab === 'benchmark'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Benchmark Comparison
          </button>
        </div>

        {/* Right: Cumulative Session Savings + New Chat + Mock Mode Toggle Switch */}
        <div className="flex items-center gap-2.5">
          {/* Cumulative Session Savings Telemetry Pill */}
          {sessionSavedTokens > 0 && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium font-mono shadow-[0_0_12px_rgba(52,211,153,0.15)] animate-in fade-in duration-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Session Saved:{' '}
                <strong className="text-emerald-300 font-bold">{sessionSavedTokens}</strong> tokens ({sessionPercent}%)
              </span>
            </div>
          )}

          {hasMessages && onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-all shadow-sm group cursor-pointer"
              title="Start a new chat session"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
              <span>New Chat</span>
            </button>
          )}

          {/* Live API Connection Status Pill with Dynamic URL Popover */}
          {!mockMode && apiStatus && (
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={handleTogglePopover}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer ${
                  apiStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                }`}
                title={
                  apiStatus === 'offline'
                    ? 'API Offline — Click to configure URL & re-ping'
                    : 'API Connected — Click to change backend URL'
                }
              >
                <span className="relative flex h-2 w-2">
                  {apiStatus === 'connected' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                  )}
                </span>
                <span>{apiStatus === 'connected' ? 'API Connected' : 'API Offline'}</span>
              </button>

              {/* Dynamic URL Override Popover */}
              {isUrlPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-2xl w-72 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-200">
                      FastAPI Backend URL
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsUrlPopoverOpen(false)}
                      className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer transition-colors"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="http://127.0.0.1:8000"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveAndRecheck();
                        } else if (e.key === 'Escape') {
                          setIsUrlPopoverOpen(false);
                        }
                      }}
                      autoFocus
                    />
                    <p className="text-[10px] text-zinc-500">
                      Saved in localStorage across browser sessions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAndRecheck}
                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
                  >
                    Save &amp; Re-check
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mock Mode Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={mockMode}
            onClick={onToggleMockMode}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
              mockMode
                ? 'bg-zinc-900/90 border-zinc-700 text-zinc-200 hover:border-zinc-600'
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            {/* Status dot */}
            <span className="relative flex h-2 w-2">
              {mockMode ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-600"></span>
              )}
            </span>

            <span className="hidden sm:inline">Mock Mode</span>

            {/* Visual switch slider */}
            <div
              className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                mockMode ? 'bg-emerald-500/30 border border-emerald-500/50' : 'bg-zinc-800 border border-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                  mockMode ? 'translate-x-3 bg-emerald-400' : 'translate-x-0 bg-zinc-400'
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
