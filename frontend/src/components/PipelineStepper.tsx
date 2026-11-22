import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface PipelineStepperProps {
  activeStep: number; // 0 to 4
  isRunning: boolean;
}

const STEPS = [
  { id: 1, name: 'Unicode Normalize', short: 'Step 1' },
  { id: 2, name: 'Generate 5 Candidates', short: 'Step 2' },
  { id: 3, name: 'Meaning Guard & Tokenize', short: 'Step 3' },
  { id: 4, name: 'Gemini API Response', short: 'Step 4' },
];

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ activeStep, isRunning }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between relative">
        {STEPS.map((step, idx) => {
          const isCompleted = activeStep > step.id || (activeStep === 4 && !isRunning && step.id === 4);
          const isActive = activeStep === step.id && (isRunning || activeStep < 4);
          const isPending = activeStep < step.id;

          return (
            <React.Fragment key={step.id}>
              {/* Step item */}
              <div className="flex items-center gap-2.5 sm:gap-3 z-10">
                {/* Step indicator circle / icon */}
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                      : isActive
                      ? 'bg-indigo-950/80 border border-indigo-500 ring-2 ring-indigo-500/50 text-indigo-400 animate-pulse shadow-[0_0_14px_rgba(99,102,241,0.4)]'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-500'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isActive ? (
                    <span className="font-mono">{step.id}</span>
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>

                {/* Step label */}
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 hidden sm:block">
                    {step.short}
                  </span>
                  <span
                    className={`text-xs font-medium tracking-tight whitespace-nowrap transition-colors duration-200 ${
                      isCompleted
                        ? 'text-zinc-200'
                        : isActive
                        ? 'text-indigo-400 font-semibold'
                        : 'text-zinc-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
              </div>

              {/* Connector line between steps */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4 hidden sm:block">
                  <div className="h-0.5 w-full bg-zinc-800 relative overflow-hidden rounded-full">
                    <div
                      className={`h-full transition-all duration-300 ${
                        activeStep > step.id || (activeStep === 4 && !isRunning)
                          ? 'bg-emerald-500 w-full'
                          : activeStep === step.id && isRunning
                          ? 'bg-gradient-to-r from-emerald-500 to-indigo-500 w-full animate-pulse'
                          : 'w-0'
                      }`}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
