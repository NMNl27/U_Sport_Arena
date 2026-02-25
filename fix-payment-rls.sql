-- Drop all payments policies first
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
DROP POLICY IF EXISTS "Users can view all payments" ON payments;
DROP POLICY IF EXISTS "Allow insert for all" ON payments;
DROP POLICY IF EXISTS "Allow select for all" ON payments;
DROP POLICY IF EXISTS "Allow service role" ON payments;

-- Completely disable RLS on payments table
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'payments';
