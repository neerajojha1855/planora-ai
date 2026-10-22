import React from 'react'
import { Sparkles, Cpu } from 'lucide-react'

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-[#26263f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-amber-400 p-[1.5px] shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#131322] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300 floating-icon" />
            </div>
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight gradient-text">Planora AI</span>
            <span className="text-[10px] block text-gray-400 uppercase tracking-widest font-mono">Celebration Intelligence</span>
          </div>
        </div>

        {/* AI & Platform Indicators */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a2e] border border-[#2d2d4a] text-xs font-medium text-gray-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Powered By: <strong className="text-purple-300">Gemma 4</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>
      </div>
    </header>
  )
}
