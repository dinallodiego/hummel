import { createClient } from '@supabase/supabase-js';
import { environment } from '../environment/environment';

export const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
