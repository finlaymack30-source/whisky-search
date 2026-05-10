import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bxqokujhuofblkrzvlke.supabase.co'
const SUPABASE_KEY = 'sb_publishable_lEgHHsga4RScVcJ2QcGHtQ_wFbgmTub'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)