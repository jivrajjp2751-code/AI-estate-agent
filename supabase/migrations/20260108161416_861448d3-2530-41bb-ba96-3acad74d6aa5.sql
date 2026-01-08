-- Fix customer_inquiries INSERT policy to be more secure
-- Drop the permissive insert policy with 'true'
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.customer_inquiries;

-- Create a more secure insert policy that still allows public submissions
-- but prevents abuse by limiting what can be inserted
CREATE POLICY "Public can submit inquiries"
ON public.customer_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Ensure required fields are present and reasonable
  char_length(name) >= 2 AND
  char_length(email) >= 5 AND
  char_length(phone) >= 10
);