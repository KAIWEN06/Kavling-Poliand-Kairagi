export type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest'

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden'

export type ReviewReportReason =
  | 'abusive'
  | 'hate'
  | 'spam'
  | 'personal_info'
  | 'irrelevant'
  | 'scam'
  | 'other'

/** Kolom aman untuk publik. Tidak ada email, telepon, alamat, atau client_id. */
export interface PublicReview {
  id: string
  rating: number
  title: string
  content: string
  photo_urls: string[]
  recommend: boolean
  helpful_count: number
  created_at: string
  author_name: string
  author_avatar_url: string | null
  viewer_voted: boolean
}

export interface PublicReviewPage {
  total: number
  items: PublicReview[]
}

export interface ReviewStats {
  total: number
  average: number | null
  recommend_yes: number
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
}

export interface ReviewInput {
  rating: number
  title: string
  content: string
  recommend: boolean
  photos: File[]
}

export interface OwnReview {
  id: string
  rating: number
  title: string
  content: string
  recommend: boolean
  photo_urls: string[]
  status: ReviewStatus
  rejection_reason: string | null
  created_at: string
}

export type BlockedTermCategory = 'profanity' | 'hate' | 'spam' | 'scam'

export interface BlockedTerm {
  id: number
  term: string
  category: BlockedTermCategory
  is_active: boolean
}

export interface AdminReviewReport {
  id: number
  reason: ReviewReportReason
  details: string | null
  status: 'open' | 'dismissed' | 'actioned'
  reporter_name: string
  created_at: string
}

export interface AdminReviewHistory {
  action: string
  note: string | null
  admin_name: string
  created_at: string
}

export interface AdminReview {
  id: string
  client_name: string
  client_avatar_url: string | null
  rating: number
  title: string
  content: string
  photo_urls: string[]
  recommend: boolean
  status: ReviewStatus
  rejection_reason: string | null
  needs_attention: boolean
  flag_reasons: string[]
  approved_at: string | null
  approved_by_name: string | null
  helpful_count: number
  report_count: number
  created_at: string
  reports: AdminReviewReport[]
  history: AdminReviewHistory[]
}

export type AdminReviewTab = 'all' | 'pending' | 'published' | 'rejected' | 'reported'

export interface AdminReviewPage {
  total: number
  counts: Record<AdminReviewTab, number>
  items: AdminReview[]
}

export type ModerationAction =
  | 'approve'
  | 'reject'
  | 'hide'
  | 'restore'
  | 'delete'
  | 'dismiss_reports'
