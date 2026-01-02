-- Fix infinite recursion in profiles RLS policies by using a SECURITY DEFINER helper

CREATE OR REPLACE FUNCTION public.has_profile_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Replace recursive admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'::public.user_role));

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_profile_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_profile_role(auth.uid(), 'admin'::public.user_role));