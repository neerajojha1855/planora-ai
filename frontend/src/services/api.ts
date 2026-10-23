import type { EventBrief, GeneratedPlanContent, PlanRecord, AuthUser } from '../types/planner'

const API_BASE = '/api/v1'

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })

  if(!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Invalid email or password')
  }

  const user = await getCurrentUser()
  if(!user) throw new Error('Failed to retrieve user profile after login')
  return user
}

export async function register(email: string, password: string, fullName: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
    }),
  })

  if(!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Registration failed. Please check your credentials')
  }

  const user = await getCurrentUser()
  if(!user) throw new Error('Failed to retrieve user profile after registration')
  return user
}

export async function loginAsGuest(): Promise<AuthUser> {
  const credentials = {
    email: 'john.doe@planora.ai',
    password: 'GuestPassword123',
  }

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify(credentials),
  })

  if(!loginRes.ok) {
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify({
        ...credentials,
        full_name: 'John Doe',
      }),
    })
    if (!regRes.ok) {
      const errorData = await regRes.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Guest auto-registration failed')
    }
  }

  const user = await getCurrentUser()
  if(!user) throw new Error('Guest authentication failed')
  return user
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
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
    await loginAsGuest()
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

interface RawPlanResponse {
  id: string
  user_id: string
  event_type: 'wedding' | 'birthday' | 'community'
  event_brief: {
    event_type: 'wedding' | 'birthday' | 'community'
    location: string
    event_date: string
    guest_count: number
    budget_amount: number
    budget_currency?: string
    additional_context?: string
  }
  plan_data: GeneratedPlanContent
  created_at: string
  updated_at?: string
}

export async function listPlans(): Promise<PlanRecord[]> {
  const res = await fetch(`${API_BASE}/plans`, {
    credentials: 'include',
  })
  if (!res.ok) return []
  const data: RawPlanResponse[] = await res.json()
  return data.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    event_type: item.event_type,
    brief: {
      event_type: item.event_brief.event_type,
      location: item.event_brief.location,
      event_date: item.event_brief.event_date,
      guest_count: item.event_brief.guest_count,
      budget: item.event_brief.budget_amount,
      currency: item.event_brief.budget_currency || 'INR',
      notes: item.event_brief.additional_context,
    },
    plan_content: item.plan_data,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at,
  }))
}

export const authEvents = new EventTarget()

export async function getPlan(planId: string): Promise<PlanRecord> {
  const res = await fetch(`${API_BASE}/plans/${planId}`, {
    credentials: 'include',
  })
  if(res.status == 401) {
    authEvents.dispatchEvent(new CustomEvent('auth_expired'))
    throw new Error('Your session has expired. Please sign in again')
  }
  if(!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to retrieve plan details')
  }
  const item: RawPlanResponse = await res.json()

  return {
    id: item.id,
    user_id: item.user_id,
    event_type: item.event_type,
    brief: {
      event_type: item.event_brief.event_type,
      location: item.event_brief.location,
      event_date: item.event_brief.event_date,
      guest_count: item.event_brief.guest_count,
      budget: item.event_brief.budget_amount,
      currency: item.event_brief.budget_currency || 'INR',
      notes: item.event_brief.additional_context,
    },
    plan_content: item.plan_data,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at,
  }
}

export async function updatePlan(
  planId: string,
  updates: { title?: string; plan_content?: GeneratedPlanContent }
): Promise<PlanRecord> {
  const res = await fetch(`${API_BASE}/plans/${planId}`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    credentials: 'include',
    body: JSON.stringify({
      title: updates.title,
      plan_data: updates.plan_content,
    }),
  })

  if(res.status === 401) {
    authEvents.dispatchEvent(new CustomEvent('auth_expired'))
    throw new Error('Your session has expired. Please sign in again')
  }

  if(!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to save updates to the plan')
  }

  const item: RawPlanResponse = await res.json()

  return {
    id: item.id,
    user_id: item.user_id,
    event_type: item.event_type,
    brief: {
      event_type: item.event_brief.event_type,
      location: item.event_brief.location,
      event_date: item.event_brief.event_date,
      guest_count: item.event_brief.guest_count,
      budget: item.event_brief.budget_amount,
      currency: item.event_brief.budget_currency || 'INR',
      notes: item.event_brief.additional_context,
    },
    plan_content: item.plan_data,
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at,
  }
}