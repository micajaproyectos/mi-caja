import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pvgahmommdbfzphyywut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2Z2FobW9tbWRiZnpwaHl5d3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3OTg5MTYsImV4cCI6MjA2OTM3NDkxNn0.fdSgW8s2yMRbDumYWDidDT2xCfO04jX17W2_bwGmEek';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

