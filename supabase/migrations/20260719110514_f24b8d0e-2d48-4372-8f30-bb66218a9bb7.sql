CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_account_type public.account_type;
BEGIN
  v_account_type := CASE
    WHEN NEW.raw_user_meta_data->>'account_type' = 'store_owner' THEN 'store_owner'::public.account_type
    ELSE 'user'::public.account_type
  END;

  INSERT INTO public.profiles (id, email, phone, display_name, first_name, last_name, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    v_account_type
  ) ON CONFLICT (id) DO UPDATE SET account_type = EXCLUDED.account_type
    WHERE public.profiles.account_type IS DISTINCT FROM EXCLUDED.account_type;

  INSERT INTO public.subscriber_memory (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_prefs (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'subscriber')
  ON CONFLICT (user_id, role, organisation_id) DO NOTHING;

  RETURN NEW;
END;
$$;