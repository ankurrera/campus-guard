-- Fix signup failure: align handle_new_user with current profiles schema
-- Do NOT touch auth schema; only replace the public function used by the existing auth trigger

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert or update a minimal profile row matching current profiles columns
  -- profiles columns: id (uuid), display_name (text), role (text), created_at, updated_at
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::text, 'student')
  )
  on conflict (id) do update
    set display_name = excluded.display_name
    where public.profiles.display_name is distinct from excluded.display_name;

  return new;
end;
$$;