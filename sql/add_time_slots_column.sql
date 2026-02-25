-- Add time_slots column to bookings table
-- Run this SQL in your Supabase SQL Editor

-- Add time_slots column if it doesn't exist
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS time_slots TEXT[];

-- Create index for time_slots for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_time_slots ON public.bookings USING GIN (time_slots);

-- Update existing bookings to populate time_slots from start_time and end_time
UPDATE public.bookings 
SET time_slots = ARRAY[
    EXTRACT(HOUR FROM start_time)::text || ':' || LPAD(EXTRACT(MINUTE FROM start_time)::text, 2, '0') || ' - ' ||
    EXTRACT(HOUR FROM end_time)::text || ':' || LPAD(EXTRACT(MINUTE FROM end_time)::text, 2, '0')
]
WHERE time_slots IS NULL 
AND start_time IS NOT NULL 
AND end_time IS NOT NULL;

-- Add comment to the column
COMMENT ON COLUMN public.bookings.time_slots IS 'Array of time slot strings (e.g., ["13:00 - 14:00", "14:00 - 15:00"])';
