import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user
const supabaseUrl = 'https://wrumulagjdwzllzkriir.supabase.co';
const supabaseAnonKey = 'sb_publishable_TrcxFCeowZtfn5rzQ6MTXA_zmr9nYyL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);