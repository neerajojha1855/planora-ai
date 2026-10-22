import type { EventBrief, GeneratedPlanContent, PlanRecord, AuthUser } from '../types/planner'

const API_BASE = '/api/v1'

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function loginDemoUser(): Promise<AuthUser> {
  const credentials = {
    email: 'demo.planner@planora.ai',
    password: 'DemoPassword123!',
  }

  // Attempt login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  })

  // If user does not exist yet in database, register them
  if (!loginRes.ok) {
    await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ...credentials,
        full_name: 'Alex Morgan (Demo)',
      }),
    })
  }

  const user = await getCurrentUser()
  if (!user) throw new Error('Demo authentication failed.')
  return user
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export async function createPlan(brief: EventBrief): Promise<PlanRecord> {
  const user = await getCurrentUser()
  if (!user) {
    await loginDemoUser()
  }

  const payload = {
    title: `${brief.event_type.toUpperCase()} Celebration in ${brief.location}`,
    event_type: brief.event_type,
    event_date: brief.event_date,
    location: brief.location,
    guest_count: Number(brief.guest_count),
    budget_amount: Number(brief.budget),
    budget_currency: brief.currency || 'INR',
    additional_context: brief.notes || '',
    priorities: ['Catering', 'Decor', 'Photography'],
    style: 'Festive & Elegant',
  }

  const res = await fetch(`${API_BASE}/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to create plan: ${res.statusText}`)
  }

  const data = await res.json()
  return {
    id: data.id,
    user_id: data.user_id,
    event_type: data.event_type,
    brief: {
      event_type: data.event_brief.event_type,
      location: data.event_brief.location,
      event_date: data.event_brief.event_date,
      guest_count: data.event_brief.guest_count,
      budget: data.event_brief.budget_amount,
      currency: data.event_brief.budget_currency || 'INR',
      notes: data.event_brief.additional_context,
    },
    plan_content: data.plan_data,
    created_at: data.created_at,
    updated_at: data.updated_at || data.created_at,
  }
}

export async function regenerateSection(
  planId: string,
  section: 'budget' | 'timeline' | 'vendor_checklist' | 'personalized_ideas',
  notes?: string
): Promise<GeneratedPlanContent> {
  const res = await fetch(`${API_BASE}/plans/${planId}/regenerate/${section}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refinement_instruction: notes }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || `Failed to regenerate section: ${res.statusText}`)
  }

  return res.json()
}
