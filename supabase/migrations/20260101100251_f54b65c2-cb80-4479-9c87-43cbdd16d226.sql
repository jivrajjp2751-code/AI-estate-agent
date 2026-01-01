-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'editor', 'viewer');

-- Create profiles table with roles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role public.user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  price TEXT NOT NULL,
  beds INTEGER NOT NULL DEFAULT 3,
  baths INTEGER NOT NULL DEFAULT 2,
  sqft TEXT NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  primary_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties policies (public read, admin/editor write)
CREATE POLICY "Anyone can view properties" ON public.properties FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert properties" ON public.properties FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admins and editors can update properties" ON public.properties FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admins and editors can delete properties" ON public.properties FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);

-- Create property_images table
CREATE TABLE public.property_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on property_images
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Property images policies
CREATE POLICY "Anyone can view property images" ON public.property_images FOR SELECT USING (true);
CREATE POLICY "Admins and editors can insert property images" ON public.property_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admins and editors can update property images" ON public.property_images FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admins and editors can delete property images" ON public.property_images FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);

-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Storage policies for property images
CREATE POLICY "Anyone can view property images" ON storage.objects FOR SELECT USING (bucket_id = 'property-images');
CREATE POLICY "Admins and editors can upload property images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'property-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admins and editors can update property images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'property-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Admins and editors can delete property images" ON storage.objects FOR DELETE USING (
  bucket_id = 'property-images' AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('admin', 'editor'))
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();