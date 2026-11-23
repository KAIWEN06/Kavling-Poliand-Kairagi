import { supabase } from '@/services/config/supabase'
import type {
  AdminReviewPage,
  BlockedTerm,
  BlockedTermCategory,
  AdminReviewTab,
  ModerationAction,
} from '@/types/review'

export const reviewModerationService = {
  async list(tab: AdminReviewTab, page: number, pageSize = 20): Promise<AdminReviewPage> {
    const { data, error } = await supabase.rpc('admin_list_reviews', {
      p_tab: tab,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
    })
    if (error) throw error
    return data as AdminReviewPage
  },

  async moderate(reviewId: string, action: ModerationAction, note?: string): Promise<void> {
    const { error } = await supabase.rpc('admin_moderate_review', {
      p_review_id: reviewId,
      p_action: action,
      p_note: note?.trim() || null,
    })
    if (error) throw error
  },

  async listTerms(): Promise<BlockedTerm[]> {
    const { data, error } = await supabase
      .from('review_blocked_terms')
      .select('id, term, category, is_active')
      .order('category')
      .order('term')
    if (error) throw error
    return (data ?? []) as BlockedTerm[]
  },

  async addTerm(term: string, category: BlockedTermCategory): Promise<void> {
    const { error } = await supabase
      .from('review_blocked_terms')
      .insert({ term: term.trim().toLowerCase(), category })
    if (error) throw error
  },

  async setTermActive(id: number, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('review_blocked_terms')
      .update({ is_active: isActive })
      .eq('id', id)
    if (error) throw error
  },

  async removeTerm(id: number): Promise<void> {
    const { error } = await supabase.from('review_blocked_terms').delete().eq('id', id)
    if (error) throw error
  },
}
