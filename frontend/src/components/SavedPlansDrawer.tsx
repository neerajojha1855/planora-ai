import React, { useEffect } from 'react'
import { X, Calendar, ArrowRight, Sparkles, FolderHeart } from 'lucide-react'
import type { PlanRecord } from '../types/planner'

interface Props {
  isOpen: boolean
  plans: PlanRecord[]
  activePlanId?: string
  onClose: () => void
  onSelectPlan: (plan: PlanRecord) => void
}

export const SavedPlansDrawer: React.FC<Props> = ({
  isOpen,
  plans,
  activePlanId,
  onClose,
  onSelectPlan,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-plans-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="glass-panel w-full max-w-md h-full border-l border-[#26263f] p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#26263f] mb-6">
            <div className="flex items-center gap-2.5">
              <FolderHeart className="w-5 h-5 text-purple-400" />
              <h3 id="saved-plans-title" className="text-lg font-bold text-white">Your Saved Blueprints</h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close saved plans drawer"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>


          {plans.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No saved plans found in this account.</p>
              <p className="text-xs text-gray-500 mt-1">Generate your first plan to save it automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((p) => {
                const isActive = p.id === activePlanId
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPlan(p)
                      onClose()
                    }}
                    className={`w-full p-4 rounded-xl text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                        : 'bg-[#151526] border-[#26263f] hover:border-purple-500/40 hover:bg-[#1a1a2e]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {p.event_type}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        ₹{p.brief.budget.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate mb-2">
                      {p.brief.guest_count} Guests · {p.brief.location}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        {p.brief.event_date}
                      </span>
                      <span className="flex items-center gap-0.5 text-purple-300 font-sans">
                        Load <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-[#26263f] text-center text-xs text-gray-500 font-mono">
          Planora AI Cloud Session Persistence
        </div>
      </div>
    </div>
  )
}
