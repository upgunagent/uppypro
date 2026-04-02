-- Create the 'resource-photos' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-photos', 'resource-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public read access for all files in the bucket
CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'resource-photos');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'resource-photos');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update photos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'resource-photos');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete photos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'resource-photos');
