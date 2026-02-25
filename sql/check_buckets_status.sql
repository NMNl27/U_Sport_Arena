-- SQL to check existing buckets and fix permissions
-- Run this in Supabase SQL Editor

-- 1. Check all existing buckets
SELECT 
    id,
    name, 
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
ORDER BY created_at;

-- 2. Check bucket ID vs name mismatch
SELECT 
    id,
    name,
    CASE WHEN id != name THEN 'MISMATCH' ELSE 'OK' END as status
FROM storage.buckets 
WHERE name = 'promotions-image';

-- 3. Check existing policies on storage.objects
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 4. Check if policies exist for promotions-image bucket
SELECT 
    policyname,
    cmd,
    roles,
    permissive
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND (qual LIKE '%promotions-image%' OR qual LIKE '%promotions%');

-- 5. Check objects in promotions-image bucket
SELECT 
    id,
    bucket_id,
    name,
    created_at,
    updated_at,
    last_accessed_at,
    metadata
FROM storage.objects 
WHERE bucket_id = 'promotions-image'
ORDER BY created_at DESC;

-- 6. Check objects by bucket ID (if different)
SELECT 
    bucket_id,
    COUNT(*) as file_count
FROM storage.objects 
GROUP BY bucket_id
ORDER BY file_count DESC;

-- 7. Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename IN ('buckets', 'objects');

-- 8. Check storage permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_schema = 'storage' 
AND table_name IN ('buckets', 'objects')
ORDER BY table_name, privilege_type;
