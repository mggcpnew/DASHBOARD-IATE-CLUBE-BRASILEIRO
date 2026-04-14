-- Create table for shared dashboards
CREATE TABLE public.shared_dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  dashboard_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shared_dashboards ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can view shared dashboards)
CREATE POLICY "Anyone can view shared dashboards" 
ON public.shared_dashboards 
FOR SELECT 
USING (true);

-- Create policy for public insert (anyone can create shared dashboards)
CREATE POLICY "Anyone can create shared dashboards" 
ON public.shared_dashboards 
FOR INSERT 
WITH CHECK (true);

-- Create policy for public delete (anyone can delete shared dashboards)
CREATE POLICY "Anyone can delete shared dashboards" 
ON public.shared_dashboards 
FOR DELETE 
USING (true);

-- Create index for faster lookups by share_id
CREATE INDEX idx_shared_dashboards_share_id ON public.shared_dashboards(share_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shared_dashboards_updated_at
BEFORE UPDATE ON public.shared_dashboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();