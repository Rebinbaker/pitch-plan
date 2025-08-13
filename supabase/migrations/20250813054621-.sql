-- Create warranty templates table
CREATE TABLE public.warranty_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  field_coordinates JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated warranties table
CREATE TABLE public.generated_warranties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  template_id UUID REFERENCES public.warranty_templates(id) NOT NULL,
  generated_pdf_url TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Enable RLS
ALTER TABLE public.warranty_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_warranties ENABLE ROW LEVEL SECURITY;

-- Create policies for warranty_templates
CREATE POLICY "Users can view warranty templates" 
ON public.warranty_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage warranty templates" 
ON public.warranty_templates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create policies for generated_warranties
CREATE POLICY "Users can view their generated warranties" 
ON public.generated_warranties 
FOR SELECT 
USING (generated_by = auth.uid());

CREATE POLICY "Users can create warranties" 
ON public.generated_warranties 
FOR INSERT 
WITH CHECK (generated_by = auth.uid());

-- Add triggers for timestamps
CREATE TRIGGER update_warranty_templates_updated_at
BEFORE UPDATE ON public.warranty_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for warranty files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('warranty-templates', 'warranty-templates', false);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-warranties', 'generated-warranties', false);

-- Create storage policies for warranty templates
CREATE POLICY "Users can view warranty template files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'warranty-templates');

CREATE POLICY "Admin can upload warranty templates" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'warranty-templates' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create storage policies for generated warranties
CREATE POLICY "Users can view their generated warranty files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'generated-warranties' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their generated warranties" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'generated-warranties' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);