-- Create table to store call-scheduled appointments
CREATE TABLE public.call_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id UUID REFERENCES public.customer_inquiries(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  appointment_date TEXT,
  appointment_time TEXT,
  property_location TEXT,
  notes TEXT,
  call_id TEXT,
  language TEXT DEFAULT 'hindi',
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins and editors can view all call appointments" 
ON public.call_appointments 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'editor')
  )
);

CREATE POLICY "Admins and editors can insert call appointments" 
ON public.call_appointments 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'editor')
  )
);

CREATE POLICY "Admins and editors can update call appointments" 
ON public.call_appointments 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'editor')
  )
);

CREATE POLICY "Admins can delete call appointments" 
ON public.call_appointments 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow edge functions to insert appointments (for VAPI webhook)
CREATE POLICY "Service role can insert call appointments" 
ON public.call_appointments 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_call_appointments_updated_at
BEFORE UPDATE ON public.call_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_appointments;