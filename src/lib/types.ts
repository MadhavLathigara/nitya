// One shape for everything you save. A new section later = a new `type`,
// so old data never needs to be rewritten.

export type ItemType =
  | 'inbox'
  | 'task'
  | 'learn'
  | 'idea'
  | 'note'
  | 'quote'
  | 'goal'
  | 'aim'
  | 'diagram'

export type TaskStatus = 'todo' | 'done' | 'someday'
export type LearnKind = 'field' | 'subject' | 'topic' | 'short' | 'tool'
export type LearnStatus = 'tolearn' | 'learning' | 'learned'
export type IdeaKind = 'idea' | 'feature' | 'option'
export type IdeaStage = 'seed' | 'exploring' | 'building' | 'launched' | 'parked'
export type DiagramKind = 'sketch' | 'image'

export interface Item {
  id: string
  type: ItemType
  title: string
  body?: string
  space: string // space id, e.g. 'personal'
  status?: string // meaning depends on type (see above)
  kind?: string // learn: LearnKind, idea: IdeaKind, diagram: DiagramKind
  parentId?: string // learning tree, idea tree, goal → aim, task → goal
  starred?: boolean // "IMP"
  pinned?: boolean // notes
  folder?: string // notes
  tags?: string[]
  date?: string // planned day, YYYY-MM-DD
  time?: string // planned time, HH:MM (24 h)
  minutes?: number // learning length
  author?: string // quotes
  source?: string // quotes
  image?: string // diagrams (data URL)
  learnedAt?: number
  reviewStep?: number
  nextReview?: string // YYYY-MM-DD
  lastReviewed?: number
  doneAt?: number
  stageAt?: number
  archived?: boolean
  sample?: boolean // example data, removable in Settings
  createdAt: number
  updatedAt: number
}

export interface Habit {
  id: string
  name: string
  part: 'morning' | 'evening'
  order: number
  sample?: boolean
}

export interface HabitLog {
  id: string // `${date}|${habitId}`
  date: string
  habitId: string
}

export interface Space {
  id: string
  name: string
}

export interface Settings {
  theme: string
  name: string
  spaces: Space[]
  morningTime: string
  reviseTime: string
  eveningTime: string
  activeSpace: string
  seeded: boolean
}

export const DEFAULT_SPACES: Space[] = [
  { id: 'personal', name: 'Personal' },
  { id: 'job', name: 'Job' },
  { id: 'side', name: 'Side Projects' },
  { id: 'health', name: 'Health' },
  { id: 'home', name: 'Home' },
]

export const DEFAULT_SETTINGS: Settings = {
  theme: 'paper',
  name: '',
  spaces: DEFAULT_SPACES,
  morningTime: '07:00',
  reviseTime: '21:00',
  eveningTime: '22:00',
  activeSpace: 'all',
  seeded: false,
}

export const LEARN_KINDS: { id: LearnKind; label: string }[] = [
  { id: 'field', label: 'Field' },
  { id: 'subject', label: 'Subject' },
  { id: 'topic', label: 'Topic' },
  { id: 'short', label: 'Short topic' },
  { id: 'tool', label: 'Tool / App' },
]

export const IDEA_STAGES: { id: IdeaStage; label: string }[] = [
  { id: 'seed', label: 'Seed' },
  { id: 'exploring', label: 'Exploring' },
  { id: 'building', label: 'Building' },
  { id: 'launched', label: 'Launched' },
]
