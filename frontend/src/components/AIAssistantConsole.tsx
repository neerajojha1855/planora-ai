import React, { useState } from 'react'
import { Sparkles, Heart, Cake, Users, Calendar, IndianRupee, MapPin, Send, Wand2 } from 'lucide-react'
import type { EventBrief, EventType } from '../types/planner'

interface Props {
  onSubmit: (brief: EventBrief) => void
  isLoading: boolean
}

const SUGGESTIONS = [
  {
    label: '💍 150-guest royal heritage wedding in Udaipur (₹15,00,000)',
    event_type: 'wedding' as const,
    budget: 1500000,
    guests: 150,
    loc: 'Udaipur, Rajasthan',
    notes: 'Royal lakeside heritage palace wedding with traditional shehnai, Rajasthani banquet, and floral mandap decoration.',
  },
  {
    label: '🎂 50-guest Bollywood rooftop birthday in Mumbai (₹75,000)',
    event_type: 'birthday' as const,
    budget: 75000,
    guests: 50,
    loc: 'Mumbai, Maharashtra',
    notes: 'Bollywood retro theme, neon disco lights, DJ spinning throwback hits, custom photo booth, and dessert station.',
  },
  {
    label: '🎪 500-guest Diwali community festival in Bangalore (₹2,50,000)',
    event_type: 'community' as const,
    budget: 250000,
    guests: 500,
    loc: 'Bangalore, Karnataka',
    notes: 'Diya lighting ceremony, street food stalls, acoustic cultural dance stage, rangoli contest, and eco-friendly fireworks.',
  },
]

export const AIAssistantConsole: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [eventType, setEventType] = useState<EventType>('wedding')
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [guestCount, setGuestCount] = useState<number | ''>('')
  const [budget, setBudget] = useState<number | ''>('')
  const [currency] = useState('INR')
  const [notes, setNotes] = useState('')

  const applySuggestion = (s: typeof SUGGESTIONS[0]) => {
    setEventType(s.event_type)
    setBudget(s.budget)
    setGuestCount(s.guests)
    setLocation(s.loc)
    setNotes(s.notes)
    if (!eventDate) {
      const d = new Date()
      d.setDate(d.getDate() + 90)
      setEventDate(d.toISOString().split('T')[0])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!location || !eventDate || !guestCount || !budget) return

    onSubmit({
      event_type: eventType,
      location,
      event_date: eventDate,
      guest_count: Number(guestCount),
      budget: Number(budget),
      currency,
      notes,
    })
  }

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden border border-[#2d2d4a] ai-pulse">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Wand2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">AI Event Planning Console</h2>
            <p className="text-xs sm:text-sm text-gray-400">Choose a suggestion below or enter your vision to architect your celebration blueprint.</p>
          </div>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mb-6">
        <span className="text-xs uppercase font-mono tracking-wider text-purple-400 block mb-2">⚡ Click a prompt to auto-fill details:</span>
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
          <label id="event-type-label" className="block text-xs font-semibold uppercase font-mono tracking-wider text-gray-400 mb-2">
            1. Select Event Type
          </label>
          <div role="radiogroup" aria-labelledby="event-type-label" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${item.label}: ${item.desc}`}
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
            <label htmlFor="event-location" className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-400" /> Location
            </label>
            <input
              id="event-location"
              aria-label="Celebration Location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
              placeholder="e.g., Udaipur, Rajasthan"
            />
          </div>

          <div>
            <label htmlFor="event-date" className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" /> Target Date
            </label>
            <input
              id="event-date"
              aria-label="Target Celebration Date"
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="event-guest-count" className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-purple-400" /> Guest Count</span>
              {guestCount !== '' && <strong className="text-purple-300 font-bold">{guestCount}</strong>}
            </label>
            <input
              id="event-guest-count"
              aria-label="Guest Count"
              type="number"
              min={1}
              max={10000}
              required
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g., 150"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>

          <div>
            <label htmlFor="event-budget" className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-amber-400" /> Budget ({currency})</span>
              {budget !== '' && (
                <strong className="text-amber-400 font-bold">₹{Number(budget).toLocaleString('en-IN')}</strong>
              )}
            </label>
            <input
              id="event-budget"
              aria-label="Budget in INR"
              type="number"
              min={100}
              step="any"
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g., 500000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Vision & Notes */}
        <div>
          <label htmlFor="event-notes" className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5">
            Vision, Vibe & Special Requests
          </label>
          <textarea
            id="event-notes"
            aria-label="Vision, Vibe & Special Requests"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm resize-none"
            placeholder="e.g., Royal heritage palace wedding with traditional shehnai, Rajasthani buffet, and floral mandap decoration..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !location || !eventDate || !guestCount || !budget}
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
