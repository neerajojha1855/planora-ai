import React from 'react'
import { Cpu, UserCheck, LogOut } from 'lucide-react'
import logoImg from '../assets/favicon.png'
import type { AuthUser } from '../types/planner'

interface Props {
  user: AuthUser | null
  onLoginDemo: () => void
  onLogout: () => void
  isAuthLoading: boolean
}

export const Navbar: React.FC<Props> = ({ user, onLoginDemo, onLogout, isAuthLoading }) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-[#26263f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Official PNG Favicon */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Planora AI Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-purple-500/20"
          />
          <div>
            <span className="font-extrabold text-xl tracking-tight gradient-text">Planora AI</span>
            <span className="text-[10px] block text-gray-400 uppercase tracking-widest font-mono">Celebration Intelligence</span>
          </div>
        </div>

        {/* AI & Platform Indicators + Demo Auth */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a2e] border border-[#2d2d4a] text-xs font-medium text-gray-300">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>Powered By: <strong className="text-purple-300">Gemini 2.5 Flash</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Online</span>
          </div>

          {/* Demo Sign-in / Profile Control */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#26263f]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span className="font-semibold">{user.full_name || user.email}</span>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg bg-[#1a1a2e] border border-[#2d2d4a] text-gray-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginDemo}
              disabled={isAuthLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/40 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAuthLoading ? 'Signing in...' : 'Demo Sign In'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
