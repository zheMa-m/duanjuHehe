import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying payment_configs...');
  const { data: configs, error: configErr } = await supabase.from('payment_configs').select('*');
  console.log('Configs:', configs);
  if (configErr) console.error('Configs Error:', configErr);

  console.log('\nQuerying system_configs...');
  const { data: sysConfigs, error: sysErr } = await supabase.from('system_configs').select('*');
  console.log('System Configs:', sysConfigs);
  if (sysErr) console.error('System Configs Error:', sysErr);
}

run().catch(console.error);
