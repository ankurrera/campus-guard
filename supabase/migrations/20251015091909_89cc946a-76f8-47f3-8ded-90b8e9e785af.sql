-- Fix get_user_role function to use correct column name (id not user_id)
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = user_uuid;
$$;

-- Update handle_new_user to properly set TA role when specified in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::text, 'student')
  )
  ON CONFLICT (id) DO UPDATE
    SET display_name = excluded.display_name,
        role = excluded.role
    WHERE public.profiles.display_name IS DISTINCT FROM excluded.display_name
       OR public.profiles.role IS DISTINCT FROM excluded.role;

  RETURN new;
END;
$$;