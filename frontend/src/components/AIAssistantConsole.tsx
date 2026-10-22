import React, { useState } from 'react'
import { Sparkles, Heart, Cake, Users, Calendar, DollarSign, MapPin, Send, Wand2 } from 'lucide-react'
import type { EventBrief, EventType } from '../types/planner'

interface Props {
  onSubmit: (brief: EventBrief) => void
  isLoading: boolean
}

const SUGGESTIONS = [
  { label: '💍 80-guest botanical garden wedding in Austin under $20k', event_type: 'wedding' as const, budget: 20000, guests: 80, loc: 'Austin, TX', notes: 'Romantic botanical theme with acoustic live music and craft cocktails.' },
  { label: '🎂 30-guest 90s retro birthday party in Seattle under $3.5k', event_type: 'birthday' as const, budget: 3500, guests: 30, loc: 'Seattle, WA', notes: 'Arcade games, neon lights, throwback playlist, and vintage custom cake.' },
  { label: '🎪 250-guest community spring harvest festival under $8k', event_type: 'community' as const, budget: 8000, guests: 250, loc: 'Portland, OR', notes: 'Local artisan stalls, food trucks, family lawn games, and acoustic stage.' },
]

export const AIAssistantConsole: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [eventType, setEventType] = useState<EventType>('wedding')
  const [location, setLocation] = useState('San Francisco, CA')
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 120)
    return d.toISOString().split('T')[0]
  })
  const [guestCount, setGuestCount] = useState(75)
  const [budget, setBudget] = useState(15000)
  const [currency] = useState('USD')
  const [notes, setNotes] = useState('Elegant outdoor celebration with seasonal farm-to-table dinner and live acoustic vibes.')

  const applySuggestion = (s: typeof SUGGESTIONS[0]) => {
    setEventType(s.event_type)
    setBudget(s.budget)
    setGuestCount(s.guests)
    setLocation(s.loc)
    setNotes(s.notes)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      event_type: eventType,
      location,
      event_date: eventDate,
      guest_count: guestCount,
      budget,
      currency,
      notes,
    })
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-[#2d2d4a] ai-pulse">
      {/* Background glow orb */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Wand2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">AI Event Planning Console</h2>
            <p className="text-xs sm:text-sm text-gray-400">Describe your dream celebration and let the AI architect your complete plan in seconds.</p>
          </div>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mb-6">
        <span className="text-xs uppercase font-mono tracking-wider text-purple-400 block mb-2">⚡ Quick Inspiration Prompts:</span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applySuggestion(s)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a2e] border border-[#2d2d4a] text-gray-300 hover:text-purple-300 hover:border-purple-500/40 hover:bg-purple-950/20 transition-all cursor-pointer text-left"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Type Grid */}
        <div>
          <label className="block text-xs font-semibold uppercase font-mono tracking-wider text-gray-400 mb-2">
            1. Select Event Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'wedding' as const, label: 'Wedding Celebration', icon: Heart, desc: 'Ceremony, banquet & milestones' },
              { type: 'birthday' as const, label: 'Milestone Birthday', icon: Cake, desc: 'Parties, entertainment & theme' },
              { type: 'community' as const, label: 'Community Festival', icon: Users, desc: 'Public gatherings, permits & stages' },
            ].map((item) => {
              const Icon = item.icon
              const isSelected = eventType === item.type
              return (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setEventType(item.type)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-400'
                      : 'bg-[#151526] border-[#26263f] hover:border-purple-500/30 hover:bg-[#1a1a2e]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-gray-400'}`} />
                    {isSelected && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-white">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.desc}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-400" /> Location
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              placeholder="City, State"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" /> Target Date
            </label>
            <input
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-purple-400" /> Guest Count</span>
              <strong className="text-purple-300 font-bold">{guestCount}</strong>
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              required
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-amber-400" /> Budget ({currency})</span>
              <strong className="text-amber-400 font-bold">${budget.toLocaleString()}</strong>
            </label>
            <input
              type="number"
              min={100}
              step={100}
              required
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Vision & Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5">
            Vision, Vibe & Special Requests
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm resize-none"
            placeholder="E.g., Farm-to-table catering, sunset photos, acoustic guitar, vegan dessert options..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="gradient-button text-white px-7 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm shadow-lg shadow-purple-600/30"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>Architecting Plan...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-300" />
                <span>Generate Celebration Blueprint</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
