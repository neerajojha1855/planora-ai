import React, { useEffect, useState } from 'react'
import { Sparkles, Brain, CheckCircle2 } from 'lucide-react'

const STEPS = [
  'Parsing celebration brief & guest requirements...',
  'Querying GenAI reasoning model (Llama 3.3 70B)...',
  'Synthesizing category-by-category budget breakdown...',
  'Calculating milestone roadmap and offset deadlines...',
  'Generating vendor checklist and key inquiry questions...',
  'Curating personalized ideas & DIY cost tiers...',
  'Finalizing comprehensive celebration blueprint...',
]

export const AIThinkingIndicator: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev))
    }, 1200)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="glass-panel rounded-2xl p-8 border border-purple-500/30 text-center space-y-6 max-w-xl mx-auto ai-pulse">
      <div className="relative inline-block">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-400 p-[2px] mx-auto">
          <div className="w-full h-full bg-[#131322] rounded-[14px] flex items-center justify-center">
            <Brain className="w-8 h-8 text-purple-400 animate-pulse" />
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-spin" />
      </div>

      <div>
        <h3 className="text-xl font-bold text-white mb-2">GenAI Assistant is Planning</h3>
        <p className="text-sm text-purple-300 font-mono">{STEPS[currentStep]}</p>
      </div>

      {/* Stepper items */}
      <div className="space-y-2 text-left text-xs">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStep
          const isCurrent = idx === currentStep
          return (
            <div
              key={idx}
              className={`flex items-center gap-2.5 transition-all ${
                isDone ? 'text-emerald-400 opacity-90' : isCurrent ? 'text-purple-300 font-semibold' : 'text-gray-600 opacity-40'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-purple-400 animate-ping' : 'bg-gray-700'}`}></span>
              )}
              <span>{step}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
