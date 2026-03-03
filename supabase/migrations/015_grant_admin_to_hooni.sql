DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE email = 'hooni.dev@kakaomobility.com'
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User hooni.dev@kakaomobility.com not found in auth.users. Skipping admin grant.';
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, email, role)
  VALUES (target_user_id, 'hooni.dev@kakaomobility.com', 'admin')
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        email = EXCLUDED.email,
        updated_at = NOW();

  RAISE NOTICE 'Admin role granted to hooni.dev@kakaomobility.com';
END $$;
