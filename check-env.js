#!/usr/bin/env node

// Script to check environment variables for Supabase
console.log('Checking Supabase environment variables...\n')

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY'
]

const missingVars = []
const presentVars = []

requiredVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    presentVars.push(varName)
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`)
  } else {
    missingVars.push(varName)
    console.log(`❌ ${varName}: NOT SET`)
  }
})

console.log('\n--- Summary ---')
if (missingVars.length === 0) {
  console.log('✅ All required environment variables are set!')
} else {
  console.log(`❌ Missing ${missingVars.length} environment variables:`)
  missingVars.forEach(varName => console.log(`   - ${varName}`))
  console.log('\nTo fix this issue:')
  console.log('1. Make sure you have a .env.local file in your project root')
  console.log('2. Add the missing environment variables to .env.local')
  console.log('3. Restart your development server')
}

// Check if we can create Supabase client
if (missingVars.length === 0) {
  console.log('\n--- Testing Supabase Connection ---')
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    console.log('✅ Supabase client created successfully')
    
    // Test storage buckets
    supabase.storage.listBuckets()
      .then(({ data, error }) => {
        if (error) {
          console.log('❌ Error listing buckets:', error.message)
        } else {
          console.log('✅ Successfully connected to Supabase Storage')
          const bucketNames = data?.map(b => b.name) || []
          console.log('Available buckets:', bucketNames)
          
          if (bucketNames.includes('fields')) {
            console.log('✅ "fields" bucket exists')
          } else {
            console.log('❌ "fields" bucket does not exist')
            console.log('To create it:')
            console.log('1. Go to your Supabase dashboard')
            console.log('2. Navigate to Storage')
            console.log('3. Click "New bucket"')
            console.log('4. Name it "fields"')
            console.log('5. Set it to public')
            console.log('6. Add appropriate RLS policies')
          }
        }
      })
      .catch(err => {
        console.log('❌ Error testing storage:', err.message)
      })
      
  } catch (error) {
    console.log('❌ Error creating Supabase client:', error.message)
  }
}
