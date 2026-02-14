-- Migration: Create image_library table for caching
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.image_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  niche TEXT NOT NULL,
  object_name TEXT NOT NULL,
  expression TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup during generation
CREATE INDEX IF NOT EXISTS idx_image_library_lookup ON image_library(niche, object_name, expression);

-- Enable RLS
ALTER TABLE image_library ENABLE ROW LEVEL SECURITY;

-- Policy for all users to read images
CREATE POLICY "Public read access to image_library" ON image_library
  FOR SELECT USING (true);

-- Policy for authenticated users to insert (via service)
CREATE POLICY "Authenticated users can insert images" ON image_library
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON image_library TO authenticated;
GRANT ALL ON image_library TO anon;
GRANT ALL ON image_library TO service_role;
