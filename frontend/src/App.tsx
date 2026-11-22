import React, { useState } from 'react';
import { TabType, OptimizationMode } from './types';
import { ChatMessage } from './types/ksmart';
import { optimizeAndRun, checkBackendHealth } from './services/api';
import { Navbar } from './components/Navbar';
import { PromptStudio } from './components/PromptStudio';
import { BenchmarkView } from './components/BenchmarkView';
import { ArchitectureModal } from './components/ArchitectureModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('playground');
  const [mockMode, setMockMode] = useState<boolean>(true);
  const [mode, setMode] = useState<OptimizationMode>('adaptive');
  const [optimize, setOptimize] = useState<boolean>(true);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<'connected' | 'offline' | null>(null);

  // Conversational Chat Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cumulative Session Telemetry
  const sessionOriginalTokens = messages.reduce(
    (acc, msg) => acc + (msg.ksmartData ? msg.ksmartData.original.tokens : 0),
    0
  );
  const sessionSavedTokens = messages.reduce(
    (acc, msg) => acc + (msg.ksmartData ? msg.ksmartData.selected.tokens_saved : 0),
    0
  );

  const handleCheckHealth = async () => {
    try {
      const isHealthy = await checkBackendHealth();
      setApiStatus(isHealthy ? 'connected' : 'offline');
    } catch {
      setApiStatus('offline');
    }
  };

  const handleToggleMockMode = async () => {
    const nextMock = !mockMode;
    setMockMode(nextMock);
    setError(null);
    if (!nextMock) {
      await handleCheckHealth();
    } else {
      setApiStatus(null);
    }
  };

  const handleSendMessage = async (promptText: string, selectedMode: OptimizationMode) => {
    setError(null);

    // 1. Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: Date.now(),
      mode: selectedMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsRunning(true);
    setActiveStep(1); // Step 1: Unicode Normalize

    try {
      // 2. Animate pipeline 1 to 4 (~1.2s total, 300ms per step)
      await new Promise((r) => setTimeout(r, 300));
      setActiveStep(2); // Step 2: Generate 5 Candidates

      await new Promise((r) => setTimeout(r, 300));
      setActiveStep(3); // Step 3: Meaning Guard & Tokenize

      await new Promise((r) => setTimeout(r, 300));
      setActiveStep(4); // Step 4: Gemini API Response

      // In mock mode add a tiny extra delay so step 4 is clearly perceptible
      if (mockMode) {
        await new Promise((r) => setTimeout(r, 300));
      }

      // 3. Resolve response data via live FastAPI client or mock engine
      const responseData = await optimizeAndRun(promptText, selectedMode, mockMode, optimize);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseData.llm_response,
        timestamp: Date.now(),
        ksmartData: responseData,
        mode: selectedMode,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error('K-SMART request failed:', err);

      let errorMessage = 'Failed to connect to backend at http://127.0.0.1:8000. Is FastAPI server running?';
      if (typeof err === 'object' && err !== null) {
        const errorObj = err as {
          response?: { data?: { detail?: string; error?: { message?: string } } };
          message?: string;
        };
        if (errorObj.response?.data?.error?.message) {
          errorMessage = errorObj.response.data.error.message;
        } else if (errorObj.response?.data?.detail) {
          errorMessage = errorObj.response.data.detail;
        } else if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }

      setError(`Live API Error: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSwitchToMock = () => {
    setMockMode(true);
    setApiStatus(null);
    setError(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveStep(0);
    setIsRunning(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sticky Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mockMode={mockMode}
        onToggleMockMode={handleToggleMockMode}
        hasMessages={messages.length > 0}
        onNewChat={handleNewChat}
        sessionOriginalTokens={sessionOriginalTokens}
        sessionSavedTokens={sessionSavedTokens}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        apiStatus={apiStatus}
        onRecheckHealth={handleCheckHealth}
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full flex flex-col">
        {/* Subtle Ambient Background Glow */}
        <div className="relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-32 bg-indigo-500/10 blur-[90px] pointer-events-none rounded-full" />
        </div>

        {/* Tab Content */}
        {activeTab === 'playground' ? (
          <PromptStudio
            messages={messages}
            isRunning={isRunning}
            activeStep={activeStep}
            onSendMessage={handleSendMessage}
            mode={mode}
            onModeChange={setMode}
            optimize={optimize}
            onOptimizeChange={setOptimize}
            error={error}
            onSwitchToMock={handleSwitchToMock}
          />
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
            <BenchmarkView />
          </div>
        )}
      </main>

      {/* 4-Stage Middleware Architecture Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Sleek Minimal Footer */}
      <footer className="w-full border-t border-zinc-900 bg-zinc-950/90 py-3 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            K-SMART: Kannada Semantic-preserving Minimization &amp; Adaptive Representation Technique
          </span>
          <span className="text-zinc-600">Research &amp; Hackathon Prototype</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
