import { useState, useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { AIAssistantConsole } from './components/AIAssistantConsole'
import { AIThinkingIndicator } from './components/AIThinkingIndicator'
import { PlanDisplay } from './components/PlanDisplay'
import { createPlan, regenerateSection, getCurrentUser, loginDemoUser, logoutUser } from './services/api'
import type { EventBrief, PlanRecord, AuthUser } from './types/planner'

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<PlanRecord | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then(setCurrentUser)
  }, [])

  const handleLoginDemo = async () => {
    setIsAuthLoading(true)
    try {
      const user = await loginDemoUser()
      setCurrentUser(user)
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Demo sign-in failed')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    setCurrentUser(null)
  }

  const handleCreatePlan = async (brief: EventBrief) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const plan = await createPlan(brief)
      setCurrentPlan(plan)
      if (!currentUser) {
        getCurrentUser().then(setCurrentUser)
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error communicating with AI Planning service.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerateSection = async (
    section: 'budget' | 'timeline' | 'vendor_checklist' | 'personalized_ideas'
  ) => {
    if (!currentPlan) return
    setIsRegenerating(true)
    setRegeneratingSection(section)
    try {
      const updatedContent = await regenerateSection(currentPlan.id, section)
      setCurrentPlan({
        ...currentPlan,
        plan_content: updatedContent,
      })
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error regenerating section.')
    } finally {
      setIsRegenerating(false)
      setRegeneratingSection(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b14] text-white selection:bg-purple-500 selection:text-white">
      <Navbar
        user={currentUser}
        onLoginDemo={handleLoginDemo}
        onLogout={handleLogout}
        isAuthLoading={isAuthLoading}
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
            onRegenerateSection={handleRegenerateSection}
            isRegenerating={isRegenerating}
            regeneratingSection={regeneratingSection}
          />
        )}
      </main>

      <footer className="border-t border-[#1c1c30] py-6 text-center text-xs text-gray-500 font-mono">
        Planora AI · Celebration Intelligence Engine · Day 4 Experience
      </footer>
    </div>
  )
}

export default App
