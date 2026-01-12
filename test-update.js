const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://uzxpasduetwlqtanunid.supabase.co'
const SUPABASE_KEY = 'sb_publishable_zXQFoCyZoEaRcmVPgEwYqg_KiQgxdSJ'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  try {
    console.log('Fetching one row from fields...')
    const list = await supabase.from('fields').select('*').limit(1)
    console.log('Select response:', { status: list.status, error: list.error && list.error.message })
    const rows = list.data || []
    if (rows.length === 0) {
      console.error('No rows in `fields` table to test.');
      return
    }
    const row = rows[0]
    console.log('Row keys:', Object.keys(row))

    // Determine candidate PK names
    const keys = Object.keys(row)
    const candidateSet = new Set()
    ;['id','field_id','fields_id','fieldId','uuid'].forEach(c=>{ if(keys.includes(c)) candidateSet.add(c) })
    keys.forEach(c=>{ if(/_id$/.test(c)) candidateSet.add(c) })
    candidateSet.add('id')
    const candidates = Array.from(candidateSet)

    // Attempt update with each candidate
    for (const candidate of candidates) {
      const candidateValue = row[candidate] ?? row.id ?? row.field_id ?? row.fieldId ?? row.uuid
      if (!candidateValue) continue
      const payload = { name: `BOT update ${Date.now()}` }
      console.log(`Trying update eq(${candidate}, ${candidateValue}) with payload`, payload)
      const res = await supabase.from('fields').update(payload).eq(candidate, candidateValue).select('*').maybeSingle()
      console.log('Update response for candidate', candidate, ':', { status: res.status, error: res.error && res.error.message, data: res.data })
      if (!res.error && res.data) {
        console.log('Update appears successful for candidate', candidate)
        return
      }
    }

    console.error('All candidate updates failed.')
  } catch (e) {
    console.error('Unexpected error running test-update:', e)
  }
}

run()
