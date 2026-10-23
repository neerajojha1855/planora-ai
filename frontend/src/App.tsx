import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { AIAssistantConsole } from './components/AIAssistantConsole'
import { AIThinkingIndicator } from './components/AIThinkingIndicator'
import { PlanDisplay } from './components/PlanDisplay'
import { SavedPlansDrawer } from './components/SavedPlansDrawer'
import { RegenerationModal } from './components/RegenerationModal'
import { LoginScreen } from './components/LoginScreen'
import { RegisterScreen } from './components/RegisterScreen'
import {
  createPlan,
  regenerateSection,
  getCurrentUser,
  login,
  register as registerUser,
  loginAsGuest,
  logoutUser,
  listPlans,
} from './services/api'
import type { EventBrief, PlanRecord, AuthUser } from './types/planner'

type AuthView = 'login' | 'register' | 'planner'

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [currentView, setCurrentView] = useState<AuthView>(() => {
    const path = window.location.pathname
    if (path === '/register') return 'register'
    return 'login'
  })
  const [isGuestLoading, setIsGuestLoading] = useState(false)
  const [savedPlans, setSavedPlans] = useState<PlanRecord[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<PlanRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenModalSection, setRegenModalSection] = useState<'budget' | 'timeline' | 'vendor_checklist' | 'personalized_ideas' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const navigateTo = (view: AuthView) => {
    setCurrentView(view)
    const path = view === 'planner' ? '/' : `/${view}`
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path === '/register') setCurrentView('register')
      else if (path === '/login') setCurrentView('login')
      else if (currentUser) setCurrentView('planner')
      else setCurrentView('login')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser])

  const refreshPlans = async () => {
    const plans = await listPlans()
    setSavedPlans(plans)
    if (plans.length > 0 && !currentPlan) {
      setCurrentPlan(plans[0])
    }
  }

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user)
        setCurrentView('planner')
        listPlans().then((plans) => {
          setSavedPlans(plans)
          if (plans.length > 0) setCurrentPlan(plans[0])
        })
      } else {
        const path = window.location.pathname
        setCurrentView(path === '/register' ? 'register' : 'login')
      }
    })
  }, [])

  const handleLoginSuccess = async (user: AuthUser) => {
    setCurrentUser(user)
    navigateTo('planner')
    await refreshPlans()
  }

  const handleGuestLogin = async () => {
    setIsGuestLoading(true)
    try {
      const user = await loginAsGuest()
      await handleLoginSuccess(user)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Guest login failed.')
    } finally {
      setIsGuestLoading(false)
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    setCurrentUser(null)
    setSavedPlans([])
    setCurrentPlan(null)
    navigateTo('login')
  }

  const handleCreatePlan = async (brief: EventBrief) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const plan = await createPlan(brief)
      setCurrentPlan(plan)
      await refreshPlans()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error communicating with AI Planning service.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmRegenerate = async (instruction: string) => {
    if (!currentPlan || !regenModalSection) return
    setIsRegenerating(true)
    const section = regenModalSection
    setRegenModalSection(null)
    try {
      const updatedContent = await regenerateSection(currentPlan.id, section, instruction)
      setCurrentPlan({
        ...currentPlan,
        plan_content: updatedContent,
      })
      await refreshPlans()
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error regenerating section.')
    } finally {
      setIsRegenerating(false)
    }
  }

  // 1. Render Login Screen
  if (currentView === 'login' && !currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onNavigateToRegister={() => navigateTo('register')}
        onLoginAsGuest={handleGuestLogin}
        isGuestLoading={isGuestLoading}
        onLogin={login}
      />
    )
  }

  // 2. Render Register Screen
  if (currentView === 'register' && !currentUser) {
    return (
      <RegisterScreen
        onRegisterSuccess={handleLoginSuccess}
        onNavigateToLogin={() => navigateTo('login')}
        onRegister={registerUser}
      />
    )
  }

  // 3. Render Main Event Planner Workspace
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b14] text-white selection:bg-purple-500 selection:text-white">
      <Navbar
        user={currentUser}
        savedPlansCount={savedPlans.length}
        onOpenSavedPlans={() => setIsDrawerOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <AIAssistantConsole onSubmit={handleCreatePlan} isLoading={isLoading} />

        {isLoading && <AIThinkingIndicator />}

        {currentPlan && !isLoading && (
          <PlanDisplay
            plan={currentPlan}
            onRequestRegenerate={(sec) => setRegenModalSection(sec)}
            isRegenerating={isRegenerating}
            regeneratingSection={regenModalSection}
          />
        )}
      </main>

      <SavedPlansDrawer
        isOpen={isDrawerOpen}
        plans={savedPlans}
        activePlanId={currentPlan?.id}
        onClose={() => setIsDrawerOpen(false)}
        onSelectPlan={(plan) => setCurrentPlan(plan)}
      />

      <RegenerationModal
        isOpen={regenModalSection !== null}
        sectionName={regenModalSection || ''}
        onClose={() => setRegenModalSection(null)}
        onConfirm={handleConfirmRegenerate}
        isLoading={isRegenerating}
      />

      <footer className="border-t border-[#1c1c30] py-6 text-center text-xs text-gray-500 font-mono">
        Planora AI · Celebration Intelligence Engine · Day 4 Experience
      </footer>
    </div>
  )
}

export default App
