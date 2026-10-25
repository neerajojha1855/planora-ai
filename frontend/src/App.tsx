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
  getPlan,
  updatePlan,
  authEvents,
} from './services/api'
import type { EventBrief, PlanRecord, AuthUser, GeneratedPlanContent } from './types/planner'

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
  const [isSavingPlan, setIsSavingPlan] = useState(false)
  const [isPlanLoading, setIsPlanLoading] = useState(false)
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
    const handleAuthExpired = () => {
      setCurrentUser(null)
      setSavedPlans([])
      setCurrentPlan(null)
      setErrorMessage('Your session has expired. Please sign in again.')
      navigateTo('login')
    }
    authEvents.addEventListener('auth_expired', handleAuthExpired)
    return () => authEvents.removeEventListener('auth_expired', handleAuthExpired)
  }, [])

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
    if (isGuestLoading) return
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
    if (isLoading || isRegenerating || isSavingPlan) return
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
    if (!currentPlan || !regenModalSection || isRegenerating || isLoading || isSavingPlan) return
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

  const handleUpdatePlan = async (updatedContent: GeneratedPlanContent) => {
    if (!currentPlan || isSavingPlan) return
    setIsSavingPlan(true)
    const optimisticPlan: PlanRecord = {
      ...currentPlan,
      plan_content: updatedContent,
      updated_at: new Date().toISOString(),
    }
    setCurrentPlan(optimisticPlan)
    try {
      const updated = await updatePlan(currentPlan.id, { plan_content: updatedContent })
      setCurrentPlan(updated)
      setSavedPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save changes to the cloud.')
      // Rollback to prior plan state if update failed
      setCurrentPlan(currentPlan)
    } finally {
      setIsSavingPlan(false)
    }
  }

  const handleSelectSavedPlan = async (selectedPlan: PlanRecord) => {
    if (isPlanLoading) return
    setIsPlanLoading(true)
    setIsDrawerOpen(false)
    try {
      const fullPlan = await getPlan(selectedPlan.id)
      setCurrentPlan(fullPlan)
    } catch {
      setCurrentPlan(selectedPlan)
    } finally {
      setIsPlanLoading(false)
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
      {/* Accessible skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        Skip to main content
      </a>

      <Navbar
        user={currentUser}
        savedPlansCount={savedPlans.length}
        onOpenSavedPlans={() => setIsDrawerOpen(true)}
        onLogout={handleLogout}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 focus:outline-none">
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between"
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error message"
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}


        <AIAssistantConsole onSubmit={handleCreatePlan} isLoading={isLoading} />

        {isLoading && <AIThinkingIndicator />}

        {isPlanLoading && (
          <div className="p-8 rounded-2xl glass-panel border border-purple-500/30 flex items-center justify-center gap-3 text-purple-300">
            <span className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin"></span>
            <span className="font-mono text-sm">Loading celebration blueprint...</span>
          </div>
        )}

        {currentPlan && !isLoading && !isPlanLoading && (
          <PlanDisplay
            plan={currentPlan}
            onRequestRegenerate={(sec) => setRegenModalSection(sec)}
            isRegenerating={isRegenerating}
            regeneratingSection={regenModalSection}
            onUpdatePlan={handleUpdatePlan}
            isSaving={isSavingPlan}
          />
        )}
      </main>

      <SavedPlansDrawer
        isOpen={isDrawerOpen}
        plans={savedPlans}
        activePlanId={currentPlan?.id}
        onClose={() => setIsDrawerOpen(false)}
        onSelectPlan={handleSelectSavedPlan}
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
