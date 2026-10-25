/**
 * Supported celebration domain types in Planora AI.
 */
export type EventType = 'wedding' | 'birthday' | 'community'

/**
 * High-level user input specifications for generating celebration blueprints.
 */
export interface EventBrief {
  event_type: EventType
  location: string
  event_date: string
  guest_count: number
  budget: number
  currency: string
  notes?: string
}

/**
 * Individual expense line-item within a category budget.
 */
export interface BudgetItem {
  category: string
  item_name: string
  estimated_cost: number
  actual_cost?: number | null
  priority: 'high' | 'medium' | 'low'
  notes?: string | null
}

/**
 * Complete balanced budget allocation breakdown with contingency reserve.
 */
export interface BudgetBreakdown {
  total_budget: number
  allocated_budget: number
  contingency_reserve: number
  currency: string
  categories: string[]
  items: BudgetItem[]
}


export interface TimelineMilestone {
  phase: string
  title: string
  description: string
  due_date_offset_days: number
  status?: 'upcoming' | 'in_progress' | 'completed'
}

export interface VendorChecklistItem {
  category: string
  role: string
  description: string
  estimated_budget: number
  booking_deadline_weeks: number
  questions_to_ask: string[]
  status?: 'to_research' | 'contacted' | 'booked' | 'not_needed'
}

export interface PersonalizedIdea {
  category: string
  title: string
  description: string
  estimated_cost_tier: 'free' | 'budget' | 'moderate' | 'splurge'
  diy_friendly: boolean
}

export interface GeneratedPlanContent {
  summary: string
  budget: BudgetBreakdown
  timeline: TimelineMilestone[]
  vendor_checklist: VendorChecklistItem[]
  personalized_ideas: PersonalizedIdea[]
  assumptions: string[]
  next_actions: string[]
}

export interface PlanRecord {
  id: string
  user_id: string
  event_type: EventType
  brief: EventBrief
  plan_content: GeneratedPlanContent
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  full_name?: string
  created_at: string
}

