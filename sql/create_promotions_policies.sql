-- Create RLS policies for promotions-image bucket
-- Run this in Supabase SQL Editor

-- 1. Create policy for public SELECT access
CREATE POLICY "promotions-image Public Select" ON storage.objects 
FOR SELECT USING (bucket_id = 'promotions-image');

-- 2. Create policy for public INSERT access  
CREATE POLICY "promotions-image Public Insert" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'promotions-image');

-- 3. Create policy for public UPDATE access
CREATE POLICY "promotions-image Public Update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'promotions-image');

-- 4. Create policy for public DELETE access
CREATE POLICY "promotions-image Public Delete" ON storage.objects 
FOR DELETE USING (bucket_id = 'promotions-image');

-- 5. Refresh storage cache
NOTIFY pgrst, 'reload schema';

-- 6. Verify policies were created
SELECT policyname, cmd, roles, permissive 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%promotions-image%'
ORDER BY policyname;
