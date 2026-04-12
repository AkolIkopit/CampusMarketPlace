import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pjqoghabztvrywvwvfdp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcW9naGFienR2cnl3dnd2ZmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTczNzIsImV4cCI6MjA5MTQzMzM3Mn0._5s5tRi_6LnzRwx2HeflzxWriOTLsIz5pTJV1w-hDQ0";

export const supabase = createClient(supabaseUrl, supabaseKey);