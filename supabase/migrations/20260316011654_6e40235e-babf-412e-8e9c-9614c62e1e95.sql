CREATE POLICY "Anyone can update shared dashboards"
ON public.shared_dashboards
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);