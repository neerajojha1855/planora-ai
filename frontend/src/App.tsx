import { Sparkles } from 'lucide-react'
import './App.css'

function App() {
  return (
    <main className="min-h-screen flex items-center justify-center" id="app-root">
      <div className="text-center space-y-4">
        <Sparkles className="mx-auto" size={48} style={{ color: 'var(--color-primary)' }} />
        <h1 className="text-4xl font-bold gradient-text">Planora</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          AI-powered event planning — coming soon.
        </p>
      </div>
    </main>
  )
}

export default App
