import { addDays, daysBetween, todayStr } from './dates'
import type { Item } from './types'

// Simple spaced repetition: review after 1, 3, 7, 14, 30, then 60 days.
// This is a common practice schedule, not a fixed scientific rule – change it here if you like.
export const REVIEW_STEPS = [1, 3, 7, 14, 30, 60]

export function onLearned(): Partial<Item> {
  const now = Date.now()
  return {
    status: 'learned',
    learnedAt: now,
    lastReviewed: now,
    reviewStep: 0,
    nextReview: addDays(todayStr(), REVIEW_STEPS[0]),
  }
}

export function onRevised(item: Item): Partial<Item> {
  const step = Math.min((item.reviewStep ?? 0) + 1, REVIEW_STEPS.length - 1)
  return {
    reviewStep: step,
    lastReviewed: Date.now(),
    nextReview: addDays(todayStr(), REVIEW_STEPS[step]),
  }
}

export function isDue(item: Item, today = todayStr()): boolean {
  return item.status === 'learned' && !!item.nextReview && item.nextReview <= today
}

// 0..1 – how "fresh" the topic still is. Used for the faded text and memory bar.
export function memoryStrength(item: Item, today = todayStr()): number {
  if (item.status !== 'learned' || !item.lastReviewed) return 0
  const step = REVIEW_STEPS[item.reviewStep ?? 0]
  const since = daysBetween(todayStr(new Date(item.lastReviewed)), today)
  const s = 1 - since / (step * 2)
  return Math.max(0.15, Math.min(1, s))
}
