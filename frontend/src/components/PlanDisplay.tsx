import React, { useState } from 'react'
import {
  Sparkles,
  IndianRupee,
  Calendar,
  ClipboardList,
  Lightbulb,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Share2,
  Printer,
  Check,
} from 'lucide-react'
import type { PlanRecord } from '../types/planner'

interface Props {
  plan: PlanRecord
  onRequestRegenerate: (section: 'budget' | 'timeline' | 'vendor_checklist' | 'personalized_ideas') => void
  isRegenerating: boolean
  regeneratingSection: string | null
}

export const PlanDisplay: React.FC<Props> = ({
  plan,
  onRequestRegenerate,
  isRegenerating,
  regeneratingSection,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'budget' | 'timeline' | 'vendors' | 'ideas'>('summary')
  const [completedMilestones, setCompletedMilestones] = useState<Record<number, boolean>>({})
  const [vendorStatuses, setVendorStatuses] = useState<Record<number, string>>({})
  const [copied, setCopied] = useState(false)

  const content = plan.plan_content

  const toggleMilestone = (idx: number) => {
    setCompletedMilestones((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const cycleVendorStatus = (idx: number) => {
    const order = ['To Research', 'Contacted', 'Booked']
    const current = vendorStatuses[idx] || 'To Research'
    const nextIdx = (order.indexOf(current) + 1) % order.length
    setVendorStatuses((prev) => ({ ...prev, [idx]: order[nextIdx] }))
  }

  const handleCopyMarkdown = () => {
    const md = `# ${plan.brief.event_type.toUpperCase()} Celebration in ${plan.brief.location}
**Location**: ${plan.brief.location} | **Date**: ${plan.brief.event_date} | **Guests**: ${plan.brief.guest_count}
**Budget**: ₹${plan.brief.budget.toLocaleString('en-IN')}

## Executive Summary
${content.summary}

## Budget Breakdown
- Total: ₹${content.budget.total_budget.toLocaleString('en-IN')}
- Allocated: ₹${content.budget.allocated_budget.toLocaleString('en-IN')}
- Contingency: ₹${content.budget.contingency_reserve.toLocaleString('en-IN')}

## Immediate Next Actions
${content.next_actions.map((a) => `- [ ] ${a}`).join('\n')}
`
    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-[#2d2d4a] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {plan.event_type} Blueprint
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Generated {new Date(plan.created_at).toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {plan.brief.guest_count} Guests in {plan.brief.location}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <span className="text-xs text-gray-400 uppercase font-mono block">Budget Target</span>
              <span className="text-xl sm:text-2xl font-black text-amber-400">
                ₹{plan.brief.budget.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Action buttons */}
            <button
              onClick={handleCopyMarkdown}
              className="p-2.5 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] text-gray-300 hover:text-white hover:border-purple-500/40 transition-all cursor-pointer"
              title="Copy Markdown Summary"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2.5 rounded-xl bg-[#1a1a2e] border border-[#2d2d4a] text-gray-300 hover:text-white hover:border-purple-500/40 transition-all cursor-pointer"
              title="Print Blueprint"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed border-t border-[#26263f] pt-4">
          {content.summary}
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#26263f] pb-3">
        {[
          { id: 'summary' as const, label: 'Executive Summary', icon: Sparkles },
          { id: 'budget' as const, label: 'Smart Budget', icon: IndianRupee },
          { id: 'timeline' as const, label: 'Milestone Timeline', icon: Calendar },
          { id: 'vendors' as const, label: 'Vendor Checklist', icon: ClipboardList },
          { id: 'ideas' as const, label: 'Personalized Ideas', icon: Lightbulb },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#151526] text-gray-400 hover:text-white hover:bg-[#1f1f38]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: SUMMARY & NEXT ACTIONS */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-[#26263f]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-purple-400" /> Immediate Next Actions
            </h3>
            <ul className="space-y-3">
              {content.next_actions.map((act, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-[#26263f]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" /> Planning Assumptions
            </h3>
            <ul className="space-y-3">
              {content.assumptions.map((ass, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                  <span>{ass}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: SMART BUDGET */}
      {activeTab === 'budget' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#26263f] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Budget Breakdown</h3>
              <p className="text-xs text-gray-400">Allocated expenses & contingency reserve</p>
            </div>
            <button
              onClick={() => onRequestRegenerate('budget')}
              disabled={isRegenerating}
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-purple-300 hover:bg-purple-800/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'budget' ? 'animate-spin' : ''}`} />
              <span>Customize & Regenerate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#151526] border border-[#2d2d4a]">
              <span className="text-xs text-gray-400 uppercase font-mono block">Total Budget</span>
              <strong className="text-xl text-white font-black">₹{content.budget.total_budget.toLocaleString('en-IN')}</strong>
            </div>
            <div className="p-4 rounded-xl bg-[#151526] border border-[#2d2d4a]">
              <span className="text-xs text-gray-400 uppercase font-mono block">Allocated Expenses</span>
              <strong className="text-xl text-purple-400 font-black">₹{content.budget.allocated_budget.toLocaleString('en-IN')}</strong>
            </div>
            <div className="p-4 rounded-xl bg-[#151526] border border-amber-500/20 bg-amber-500/5">
              <span className="text-xs text-amber-400 uppercase font-mono block">Contingency Reserve</span>
              <strong className="text-xl text-amber-300 font-black">₹{content.budget.contingency_reserve.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase font-mono text-gray-400 border-b border-[#26263f]">
                <tr>
                  <th className="pb-3">Item / Service</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Priority</th>
                  <th className="pb-3 text-right">Estimated Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202033]">
                {content.budget.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#1a1a2e]/50 transition-colors">
                    <td className="py-3 font-medium text-white">{item.item_name}</td>
                    <td className="py-3 text-gray-400">{item.category}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        item.priority === 'high' ? 'bg-rose-500/10 text-rose-400' :
                        item.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-white">
                      ₹{item.estimated_cost.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TIMELINE WITH INTERACTIVE CHECKMARKS */}
      {activeTab === 'timeline' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#26263f] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Milestone Roadmap</h3>
              <p className="text-xs text-gray-400">Click any milestone card to mark as completed</p>
            </div>
            <button
              onClick={() => onRequestRegenerate('timeline')}
              disabled={isRegenerating}
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-purple-300 hover:bg-purple-800/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'timeline' ? 'animate-spin' : ''}`} />
              <span>Customize & Regenerate</span>
            </button>
          </div>

          <div className="relative border-l-2 border-purple-500/30 ml-4 pl-6 space-y-6">
            {content.timeline.map((item, idx) => {
              const isDone = completedMilestones[idx]
              return (
                <div
                  key={idx}
                  onClick={() => toggleMilestone(idx)}
                  className="relative group cursor-pointer"
                >
                  <span className={`absolute -left-[31px] top-2 w-3.5 h-3.5 rounded-full ring-4 ring-[#131322] transition-colors ${
                    isDone ? 'bg-emerald-400' : 'bg-purple-500'
                  }`}></span>
                  <div className={`glass-panel rounded-xl p-4 border transition-all ${
                    isDone
                      ? 'border-emerald-500/30 bg-emerald-950/10 opacity-75'
                      : 'border-[#26263f] hover:border-purple-500/40'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono uppercase text-purple-400 font-bold">{item.phase}</span>
                      <span className="text-xs text-gray-400 font-mono">T-{item.due_date_offset_days} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <h4 className={`text-base font-bold ${isDone ? 'line-through text-gray-400' : 'text-white'}`}>
                        {item.title}
                      </h4>
                      {isDone && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{item.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 4: VENDORS WITH STATUS BADGES */}
      {activeTab === 'vendors' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#26263f] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Vendor Checklist & Inquiry Inquiries</h3>
              <p className="text-xs text-gray-400">Click a status badge to toggle inquiry state</p>
            </div>
            <button
              onClick={() => onRequestRegenerate('vendor_checklist')}
              disabled={isRegenerating}
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-purple-300 hover:bg-purple-800/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'vendor_checklist' ? 'animate-spin' : ''}`} />
              <span>Customize & Regenerate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.vendor_checklist.map((v, idx) => {
              const status = vendorStatuses[idx] || 'To Research'
              return (
                <div key={idx} className="glass-panel rounded-xl p-5 border border-[#26263f] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {v.category}
                    </span>
                    <button
                      onClick={() => cycleVendorStatus(idx)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        status === 'Booked' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        status === 'Contacted' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-gray-800 text-gray-300 border border-gray-700'
                      }`}
                      title="Click to cycle status"
                    >
                      {status}
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-white">{v.role}</h4>
                  <p className="text-sm text-gray-300">{v.description}</p>
                  <div className="flex items-center justify-between text-xs font-mono pt-1">
                    <span className="text-gray-400">Book: <strong className="text-purple-300">{v.booking_deadline_weeks}w prior</strong></span>
                    <span className="text-amber-400 font-bold">Est. ₹{v.estimated_budget.toLocaleString('en-IN')}</span>
                  </div>

                  {v.questions_to_ask && v.questions_to_ask.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#26263f]">
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 mb-2">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" /> Key Questions to Ask:
                      </span>
                      <ul className="space-y-1.5 text-xs text-gray-300">
                        {v.questions_to_ask.map((q, qIdx) => (
                          <li key={qIdx} className="italic">"{q}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 5: PERSONALIZED IDEAS */}
      {activeTab === 'ideas' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#26263f] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Creative Personalized Touches</h3>
              <p className="text-xs text-gray-400">Tailored concepts and DIY highlights</p>
            </div>
            <button
              onClick={() => onRequestRegenerate('personalized_ideas')}
              disabled={isRegenerating}
              className="text-xs px-3.5 py-2 rounded-xl bg-purple-900/40 border border-purple-500/30 text-purple-300 hover:bg-purple-800/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regeneratingSection === 'personalized_ideas' ? 'animate-spin' : ''}`} />
              <span>Customize & Regenerate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.personalized_ideas.map((idea, idx) => (
              <div key={idx} className="glass-panel-interactive rounded-xl p-5 border border-[#26263f] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-purple-400 font-mono font-bold uppercase">{idea.category}</span>
                    <div className="flex items-center gap-2">
                      {idea.diy_friendly && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          DIY-Friendly
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {idea.estimated_cost_tier}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">{idea.title}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed">{idea.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
