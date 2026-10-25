import React, { useState, useEffect } from 'react'
import { Sparkles, X, Wand2 } from 'lucide-react'

interface Props {
  isOpen: boolean
  sectionName: string
  onClose: () => void
  onConfirm: (instruction: string) => void
  isLoading: boolean
}

export const RegenerationModal: React.FC<Props> = ({
  isOpen,
  sectionName,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [instruction, setInstruction] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  if (!isOpen) return null

  const formattedSection = sectionName.replace('_', ' ').toUpperCase()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm(instruction)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="regen-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-purple-500/40 relative shadow-2xl shadow-purple-500/10">
        <button
          onClick={onClose}
          aria-label="Close regeneration dialog"
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Wand2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 id="regen-dialog-title" className="text-lg font-bold text-white">Regenerate {formattedSection}</h3>
            <p className="text-xs text-gray-400">Instruct Gemini to customize this specific section</p>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 font-mono uppercase mb-2">
              Refinement Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Reallocate 15% from venue to photography, or add traditional Rajasthani folk musicians..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-[#151526] border border-[#26263f]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="gradient-button px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Regenerate with AI</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
