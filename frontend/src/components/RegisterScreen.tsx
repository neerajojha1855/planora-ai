import React, { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, UserPlus, Sparkles } from 'lucide-react'
import logoImg from '../assets/favicon.png'
import type { AuthUser } from '../types/planner'

interface Props {
  onRegisterSuccess: (user: AuthUser) => void
  onNavigateToLogin: () => void
  onRegister: (email: string, pass: string, name: string) => Promise<AuthUser>
}

export const RegisterScreen: React.FC<Props> = ({
  onRegisterSuccess,
  onNavigateToLogin,
  onRegister,
}) => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const user = await onRegister(email, password, fullName)
      onRegisterSuccess(user)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0b14] relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-panel w-full max-w-md rounded-2xl p-8 border border-[#2d2d4a] relative z-10 space-y-6 shadow-2xl shadow-purple-500/10">
        <div className="text-center space-y-2">
          <img
            src={logoImg}
            alt="Planora AI Logo"
            className="w-14 h-14 mx-auto rounded-2xl object-contain shadow-lg shadow-purple-500/30"
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create your Account</h1>
          <p className="text-xs text-gray-400">Join Planora to architect and save your celebration blueprints</p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="underline font-bold text-[11px] cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" /> Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Morgan"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-purple-400" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase font-mono mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-400" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 chars, mixed case & digit"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#151526] border border-[#2d2d4a] text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Requires 8+ chars, with uppercase, lowercase, and a number.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full gradient-button text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm shadow-lg shadow-purple-600/30"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-amber-300" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-purple-400 font-bold hover:text-purple-300 underline cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
