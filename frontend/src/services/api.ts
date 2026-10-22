import type { EventBrief, GeneratedPlanContent, PlanRecord } from '../types/planner'

const API_BASE = '/api/v1'

export async function createPlan(brief: EventBrief): Promise<PlanRecord> {
  const res = await fetch(`${API_BASE}/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brief),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to create plan: ${res.statusText}`)
  }

  return res.json()
}

export async function regenerateSection(
  planId: string,
  section: 'budget' | 'timeline' | 'vendor_checklist' | 'personalized_ideas',
  notes?: string
): Promise<GeneratedPlanContent> {
  const res = await fetch(`${API_BASE}/plans/${planId}/regenerate/${section}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to regenerate section: ${res.statusText}`)
  }

  return res.json()
}
