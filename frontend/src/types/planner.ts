export type EventType = 'wedding' | 'birthday' | 'community'

export interface EventBrief {
  event_type: EventType
  location: string
  event_date: string
  guest_count: number
  budget: number
  currency: string
  notes?: string
}

export interface BudgetItem {
  category: string
  item_name: string
  estimated_cost: number
  priority: 'high' | 'medium' | 'low'
}

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
}

export interface VendorChecklistItem {
  category: string
  role: string
  description: string
  estimated_budget: number
  booking_deadline_weeks: number
  questions_to_ask: string[]
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
