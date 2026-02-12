
import { createClient } from '@supabase/supabase-js';

// Em ambiente de desenvolvimento local, você pode preencher aqui.
// No deploy (Vercel), ele pegará automaticamente das variáveis de ambiente.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mdpohvrowkkddaigqmco.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hvr0D_3nA2qXi_S5I0wCZA_fyK55LC-';

export const supabase = createClient(supabaseUrl, supabaseKey);
