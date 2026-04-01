import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arsubmuibjksmtppjasb.supabase.co'
const supabaseAnonKey = 'sb_publishable_oBxqQTCpXxVYToXkdTChBg_WwLk01Rd'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
