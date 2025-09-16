#!/usr/bin/env node

const { execSync } = require('child_process')

console.log('🚀 Setting up PostgreSQL database...')

// Generate Prisma client
try {
  execSync('npx prisma generate', { stdio: 'inherit' })
  console.log('✅ Prisma client generated')
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message)
  process.exit(1)
}

// Push schema to database
try {
  execSync('npx prisma db push', { stdio: 'inherit' })
  console.log('✅ Database schema pushed successfully')
} catch (error) {
  console.error('❌ Failed to push database schema:', error.message)
  process.exit(1)
}

console.log('🎉 Database setup complete!')
