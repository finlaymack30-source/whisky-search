import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bxqokujhuofblkrzvlke.supabase.co'
const SUPABASE_KEY = 'sb_publishable_lEgHHsga4RScVcJ2QcGHtQ_wFbgmTub'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function fetchSubscription(userId) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data ?? null
}