-- Add delete policy for authenticated users
CREATE POLICY "Authenticated users can delete inquiries" 
ON public.customer_inquiries 
FOR DELETE 
USING (auth.uid() IS NOT NULL);