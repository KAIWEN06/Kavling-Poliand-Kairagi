import { supabase } from '@/services/config/supabase'

export interface MarketingHeadTeamMember {
  id: string
  full_name: string
  prospect_count: number
  active_spk_count: number
  approved_spk_count: number
}

export interface MarketingHeadDashboard {
  team_count: number
  prospect_count: number
  active_spk_count: number
  approved_spk_count: number
  team: MarketingHeadTeamMember[]
}

export const marketingHeadService = {
  async getDashboard(): Promise<MarketingHeadDashboard> {
    const { data, error } = await supabase.rpc('get_marketing_head_dashboard')
    if (error) throw error
    return data as MarketingHeadDashboard
  },
}
