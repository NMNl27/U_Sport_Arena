require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(url, key)

async function run() {
  try {
    console.log('Attempting update on fields.fields_id=5')
    const payload = { name: 'ทดสอบจาก Node (service role)' }
    const res = await supabase.from('fields').update(payload).eq('fields_id', 5).select('*').maybeSingle()
    console.log('response.status ->', res.status)
    console.log('response.error ->', res.error)
    console.log('response.data ->', res.data)
  } catch (e) {
    console.error('Unexpected error:', e)
  }
}

run()
