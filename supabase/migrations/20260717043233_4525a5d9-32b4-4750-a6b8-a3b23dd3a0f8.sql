
-- ============================================================================
-- TAYLOR INTELLIGENCE — FOUNDATION SCHEMA (M1)
-- Multi-tenant, RLS-first, soft-delete, audit-logged, i18n-ready
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SHARED HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'retailer_admin', 'store_manager', 'staff', 'subscriber'
);

CREATE TYPE public.organisation_type AS ENUM (
  'retail_group', 'brand', 'franchise', 'independent', 'partner'
);

CREATE TYPE public.store_status AS ENUM (
  'draft', 'active', 'paused', 'archived'
);

CREATE TYPE public.promotion_type AS ENUM (
  'weekly_special', 'flash_sale', 'discount', 'bundle', 'seasonal', 'sponsored'
);

CREATE TYPE public.coupon_status AS ENUM (
  'draft', 'active', 'paused', 'expired', 'archived'
);

CREATE TYPE public.catalogue_type AS ENUM (
  'weekly_flyer', 'monthly', 'seasonal', 'campaign'
);

CREATE TYPE public.campaign_scope AS ENUM (
  'store', 'brand', 'promotion', 'push'
);

CREATE TYPE public.qr_code_type AS ENUM (
  'store_invite', 'campaign', 'promotion', 'coupon', 'catalogue'
);

CREATE TYPE public.notification_channel AS ENUM (
  'in_app', 'push', 'email', 'sms'
);

CREATE TYPE public.notification_status AS ENUM (
  'queued', 'sent', 'delivered', 'failed', 'read'
);

CREATE TYPE public.notification_category AS ENUM (
  'promotion', 'coupon', 'expiry_alert', 'weather', 'recipe', 'reminder',
  'campaign', 'life_moment', 'system'
);

CREATE TYPE public.message_role AS ENUM ('user', 'assistant', 'system', 'tool');

CREATE TYPE public.subscription_target AS ENUM (
  'store', 'department', 'brand', 'category', 'campaign', 'region'
);

CREATE TYPE public.life_moment_type AS ENUM (
  'birthday', 'anniversary', 'school_term', 'festive', 'custom'
);

-- ============================================================================
-- REFERENCE DATA (public read)
-- ============================================================================

CREATE TABLE public.countries (
  code TEXT PRIMARY KEY,           -- ISO 3166-1 alpha-2, e.g. 'ZA'
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  default_timezone TEXT NOT NULL,
  default_language TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries are public" ON public.countries FOR SELECT USING (true);

CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,           -- ISO 4217, e.g. 'ZAR'
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_digits SMALLINT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Currencies are public" ON public.currencies FOR SELECT USING (true);

CREATE TABLE public.languages (
  code TEXT PRIMARY KEY,           -- BCP-47, e.g. 'en-ZA', 'zu-ZA'
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.languages TO anon, authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Languages are public" ON public.languages FOR SELECT USING (true);

CREATE TABLE public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  language_code TEXT NOT NULL REFERENCES public.languages(code),
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (namespace, key, language_code)
);
GRANT SELECT ON public.translations TO anon, authenticated;
GRANT ALL ON public.translations TO service_role;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations are public" ON public.translations FOR SELECT USING (true);
CREATE TRIGGER trg_translations_updated BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- USER ROLES  (roles NEVER on profiles — separate table + has_role())
-- ============================================================================

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  organisation_id UUID, -- FK added after organisations table
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, organisation_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id UUID, _role public.app_role, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (organisation_id = _org_id OR role = 'super_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_orgs()
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT organisation_id FROM public.user_roles
  WHERE user_id = auth.uid() AND organisation_id IS NOT NULL
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- PROFILES  (extends auth.users; auto-created on signup)
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'en-ZA' REFERENCES public.languages(code),
  country_code TEXT NOT NULL DEFAULT 'ZA' REFERENCES public.countries(code),
  currency_code TEXT NOT NULL DEFAULT 'ZAR' REFERENCES public.currencies(code),
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  preferred_greeting TEXT,
  communication_style TEXT,       -- friendly / formal / concise
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ORGANISATIONS  (the tenant boundary)
-- ============================================================================

CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type public.organisation_type NOT NULL DEFAULT 'independent',
  country_code TEXT NOT NULL DEFAULT 'ZA' REFERENCES public.countries(code),
  default_currency TEXT NOT NULL DEFAULT 'ZAR' REFERENCES public.currencies(code),
  default_language TEXT NOT NULL DEFAULT 'en-ZA' REFERENCES public.languages(code),
  logo_url TEXT,
  brand_colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT ALL ON public.organisations TO service_role;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_org_fk
  FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE POLICY "Members read own orgs" ON public.organisations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.current_user_orgs()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Retailer admins update own org" ON public.organisations
  FOR UPDATE TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', id));

CREATE POLICY "Super admins manage orgs" ON public.organisations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_organisations_updated BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- STORES
-- ============================================================================

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,             -- unique within org, used in QR
  qr_slug TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  status public.store_status NOT NULL DEFAULT 'draft',
  description TEXT,
  logo_url TEXT,
  hero_image_url TEXT,
  brand_colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'ZA' REFERENCES public.countries(code),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
  trading_hours JSONB NOT NULL DEFAULT '{}'::jsonb, -- {mon:{open,close}, ...}
  contact_email TEXT,
  contact_phone TEXT,
  manager_id UUID REFERENCES auth.users(id),
  subscription_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organisation_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public stores visible" ON public.stores
  FOR SELECT USING (status = 'active' AND is_public = true AND deleted_at IS NULL);

CREATE POLICY "Org members read own stores" ON public.stores
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.current_user_orgs())
      OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Retailer admins manage own stores" ON public.stores
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)
      OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)
      OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX idx_stores_org ON public.stores(organisation_id);
CREATE INDEX idx_stores_status ON public.stores(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_stores_geo ON public.stores(latitude, longitude);
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Store departments
CREATE TABLE public.store_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_departments TO authenticated;
GRANT SELECT ON public.store_departments TO anon;
GRANT ALL ON public.store_departments TO service_role;
ALTER TABLE public.store_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Departments follow store visibility" ON public.store_departments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
      AND (s.is_public = true OR s.organisation_id IN (SELECT public.current_user_orgs())))
  );
CREATE POLICY "Retailer admins manage departments" ON public.store_departments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', s.organisation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', s.organisation_id)));
CREATE TRIGGER trg_store_departments_updated BEFORE UPDATE ON public.store_departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Store staff
CREATE TABLE public.store_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'staff',
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_staff TO authenticated;
GRANT ALL ON public.store_staff TO service_role;
ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read own membership" ON public.store_staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
      AND public.has_role_in_org(auth.uid(), 'retailer_admin', s.organisation_id))
    OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Retailer admins manage staff" ON public.store_staff
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', s.organisation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', s.organisation_id)));
CREATE TRIGGER trg_store_staff_updated BEFORE UPDATE ON public.store_staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- CATALOG: brands, categories, products
-- ============================================================================

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  website_url TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false, -- global FMCG brand vs org-owned
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT SELECT ON public.brands TO anon;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brands are public read" ON public.brands FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Retailer admins manage own brands" ON public.brands
  FOR ALL TO authenticated
  USING (organisation_id IS NULL AND public.has_role(auth.uid(), 'super_admin')
      OR (organisation_id IS NOT NULL
          AND public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)))
  WITH CHECK (organisation_id IS NULL AND public.has_role(auth.uid(), 'super_admin')
      OR (organisation_id IS NOT NULL
          AND public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)));
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_global BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public read" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Super admins manage categories" ON public.product_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_product_categories_updated BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  description TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  packaging JSONB NOT NULL DEFAULT '{}'::jsonb,
  nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
  unit TEXT,                       -- kg, ea, L
  unit_amount NUMERIC(12,3),
  currency_code TEXT NOT NULL DEFAULT 'ZAR' REFERENCES public.currencies(code),
  base_price NUMERIC(12,2),
  is_available BOOLEAN NOT NULL DEFAULT true,
  expiry_days_default INT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organisation_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products public read when available" ON public.products
  FOR SELECT USING (is_available = true AND deleted_at IS NULL);
CREATE POLICY "Org members read own products" ON public.products
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.current_user_orgs())
      OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Retailer manages own products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)
      OR public.has_role_in_org(auth.uid(), 'store_manager', organisation_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)
      OR public.has_role_in_org(auth.uid(), 'store_manager', organisation_id));
CREATE INDEX idx_products_org ON public.products(organisation_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'ZAR' REFERENCES public.currencies(code),
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;
GRANT SELECT ON public.product_prices TO anon;
GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prices public read" ON public.product_prices FOR SELECT USING (true);
CREATE POLICY "Retailer manages prices" ON public.product_prices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', p.organisation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', p.organisation_id)));
CREATE INDEX idx_product_prices_product ON public.product_prices(product_id);
CREATE INDEX idx_product_prices_store ON public.product_prices(store_id);

CREATE TABLE public.product_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  is_in_stock BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, store_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_inventory TO authenticated;
GRANT ALL ON public.product_inventory TO service_role;
ALTER TABLE public.product_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Retailer manages inventory" ON public.product_inventory
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', s.organisation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', s.organisation_id)));

-- ============================================================================
-- PROMOTIONS, COUPONS, CATALOGUES (schema — UI in later milestone)
-- ============================================================================

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type public.promotion_type NOT NULL DEFAULT 'weekly_special',
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  sponsor_brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  discount_percent NUMERIC(5,2),
  discount_amount NUMERIC(12,2),
  original_price NUMERIC(12,2),
  sale_price NUMERIC(12,2),
  currency_code TEXT NOT NULL DEFAULT 'ZAR' REFERENCES public.currencies(code),
  hero_image_url TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT SELECT ON public.promotions TO anon;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published promotions public read" ON public.promotions
  FOR SELECT USING (is_published = true AND deleted_at IS NULL
    AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Org members read own promotions" ON public.promotions
  FOR SELECT TO authenticated
  USING (organisation_id IN (SELECT public.current_user_orgs())
      OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Retailer manages own promotions" ON public.promotions
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)
      OR public.has_role_in_org(auth.uid(), 'store_manager', organisation_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)
      OR public.has_role_in_org(auth.uid(), 'store_manager', organisation_id));
CREATE INDEX idx_promotions_org ON public.promotions(organisation_id);
CREATE INDEX idx_promotions_store ON public.promotions(store_id);
CREATE INDEX idx_promotions_window ON public.promotions(starts_at, ends_at) WHERE is_published;
CREATE TRIGGER trg_promotions_updated BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.promotion_products (
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_products TO authenticated;
GRANT SELECT ON public.promotion_products TO anon;
GRANT ALL ON public.promotion_products TO service_role;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promotion products follow promotion" ON public.promotion_products
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id
    AND p.is_published AND p.deleted_at IS NULL));
CREATE POLICY "Retailer manages promotion products" ON public.promotion_products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', p.organisation_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id
    AND public.has_role_in_org(auth.uid(), 'retailer_admin', p.organisation_id)));

CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  qr_payload TEXT NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  discount_percent NUMERIC(5,2),
  discount_amount NUMERIC(12,2),
  currency_code TEXT NOT NULL DEFAULT 'ZAR' REFERENCES public.currencies(code),
  usage_limit_total INT,
  usage_limit_per_user INT DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  status public.coupon_status NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organisation_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active coupons visible to subscribers" ON public.coupons
  FOR SELECT TO authenticated
  USING (status = 'active' AND deleted_at IS NULL
      AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Retailer manages coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.coupons c WHERE c.id = coupon_id
      AND public.has_role_in_org(auth.uid(), 'retailer_admin', c.organisation_id)));
CREATE POLICY "Users create own redemptions" ON public.coupon_redemptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.catalogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type public.catalogue_type NOT NULL DEFAULT 'weekly_flyer',
  cover_image_url TEXT,
  pdf_url TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_published BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogues TO authenticated;
GRANT SELECT ON public.catalogues TO anon;
GRANT ALL ON public.catalogues TO service_role;
ALTER TABLE public.catalogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published catalogues public" ON public.catalogues
  FOR SELECT USING (is_published = true AND deleted_at IS NULL);
CREATE POLICY "Retailer manages catalogues" ON public.catalogues
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id));
CREATE TRIGGER trg_catalogues_updated BEFORE UPDATE ON public.catalogues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- CAMPAIGNS + QR CODES
-- ============================================================================

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope public.campaign_scope NOT NULL DEFAULT 'store',
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Retailer manages campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id));
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  type public.qr_code_type NOT NULL,
  target_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  label TEXT,
  scan_count INT NOT NULL DEFAULT 0,
  conversion_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_codes TO authenticated;
GRANT SELECT ON public.qr_codes TO anon;
GRANT ALL ON public.qr_codes TO service_role;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active QR codes public read by slug" ON public.qr_codes
  FOR SELECT USING (is_active = true);
CREATE POLICY "Retailer manages QR codes" ON public.qr_codes
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id));
CREATE TRIGGER trg_qr_codes_updated BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SUBSCRIBER SIDE: subscriptions, memory, life moments
-- ============================================================================

CREATE TABLE public.subscriber_store_subs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type public.subscription_target NOT NULL DEFAULT 'store',
  target_id UUID NOT NULL,          -- store_id / dept_id / brand_id / category_id
  source TEXT,                       -- qr / link / directory / campaign
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriber_store_subs TO authenticated;
GRANT ALL ON public.subscriber_store_subs TO service_role;
ALTER TABLE public.subscriber_store_subs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscriptions" ON public.subscriber_store_subs
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_subs_user ON public.subscriber_store_subs(user_id);
CREATE INDEX idx_subs_target ON public.subscriber_store_subs(target_type, target_id);
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriber_store_subs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Taylor's structured memory (feeds the Intelligence Engine in later milestone)
CREATE TABLE public.subscriber_memory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  personal JSONB NOT NULL DEFAULT '{}'::jsonb,      -- name, greeting, household, style
  shopping JSONB NOT NULL DEFAULT '{}'::jsonb,      -- favourite stores/brands/products
  food JSONB NOT NULL DEFAULT '{}'::jsonb,          -- meals, ingredients, diet, allergies
  lifestyle JSONB NOT NULL DEFAULT '{}'::jsonb,     -- fitness, budget, seasonal prefs
  conversation JSONB NOT NULL DEFAULT '{}'::jsonb,  -- topics, past recs, feedback
  consent JSONB NOT NULL DEFAULT '{}'::jsonb,       -- per-field opt-in flags
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriber_memory TO authenticated;
GRANT ALL ON public.subscriber_memory TO service_role;
ALTER TABLE public.subscriber_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memory" ON public.subscriber_memory
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_subscriber_memory_updated BEFORE UPDATE ON public.subscriber_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.life_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.life_moment_type NOT NULL,
  title TEXT NOT NULL,
  moment_date DATE,
  recurs_annually BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_moments TO authenticated;
GRANT ALL ON public.life_moments TO service_role;
ALTER TABLE public.life_moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own life moments" ON public.life_moments
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_life_moments_updated BEFORE UPDATE ON public.life_moments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TAYLOR CONVERSATIONS
-- ============================================================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  last_message_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_conversations_user ON public.conversations(user_id, last_message_at DESC);
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.message_role NOT NULL,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,        -- ai-sdk parts array
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,  -- images/voice/receipts
  ai_run_id TEXT,                                   -- X-Lovable-AIG-Run-ID
  ai_model TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages" ON public.messages
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

-- ============================================================================
-- NOTIFICATIONS (schema — engine in later milestone)
-- ============================================================================

CREATE TABLE public.notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app BOOLEAN NOT NULL DEFAULT true,
  push BOOLEAN NOT NULL DEFAULT true,
  email BOOLEAN NOT NULL DEFAULT false,
  sms BOOLEAN NOT NULL DEFAULT false,
  categories JSONB NOT NULL DEFAULT '{"promotion":true,"coupon":true,"expiry_alert":true,"weather":true,"recipe":true,"reminder":true,"campaign":true,"life_moment":true,"system":true}'::jsonb,
  quiet_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notif prefs" ON public.notification_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_notif_prefs_updated BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.notification_category NOT NULL DEFAULT 'system',
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  status public.notification_status NOT NULL DEFAULT 'queued',
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  related_promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  related_coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  related_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============================================================================
-- RECIPES / LISTS / PANTRY (schema — UI in later milestone)
-- ============================================================================

CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  hero_image_url TEXT,
  difficulty TEXT,               -- easy / medium / hard
  cooking_time_minutes INT,
  servings INT,
  nutrition JSONB NOT NULL DEFAULT '{}'::jsonb,
  weather_tags TEXT[] NOT NULL DEFAULT '{}',
  cuisine_tags TEXT[] NOT NULL DEFAULT '{}',
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  sponsor_brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT SELECT ON public.recipes TO anon;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published recipes public" ON public.recipes
  FOR SELECT USING (is_published = true AND deleted_at IS NULL);
CREATE POLICY "Admins manage recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')
      OR (organisation_id IS NOT NULL
          AND public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin')
      OR (organisation_id IS NOT NULL
          AND public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id)));
CREATE TRIGGER trg_recipes_updated BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(12,3),
  unit TEXT,
  notes TEXT,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;
GRANT SELECT ON public.recipe_ingredients TO anon;
GRANT ALL ON public.recipe_ingredients TO service_role;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipe ingredients follow recipe" ON public.recipe_ingredients
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id
    AND r.is_published AND r.deleted_at IS NULL));
CREATE POLICY "Admins manage recipe ingredients" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id
    AND (public.has_role(auth.uid(), 'super_admin')
      OR (r.organisation_id IS NOT NULL
        AND public.has_role_in_org(auth.uid(), 'retailer_admin', r.organisation_id)))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id
    AND (public.has_role(auth.uid(), 'super_admin')
      OR (r.organisation_id IS NOT NULL
        AND public.has_role_in_org(auth.uid(), 'retailer_admin', r.organisation_id)))));

CREATE TABLE public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Shopping List',
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  estimated_total NUMERIC(12,2),
  estimated_savings NUMERIC(12,2),
  currency_code TEXT NOT NULL DEFAULT 'ZAR' REFERENCES public.currencies(code),
  status TEXT NOT NULL DEFAULT 'active',   -- active/completed/archived
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_lists TO authenticated;
GRANT ALL ON public.shopping_lists TO service_role;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lists" ON public.shopping_lists
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_shopping_lists_updated BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(12,3) DEFAULT 1,
  unit TEXT,
  estimated_price NUMERIC(12,2),
  is_checked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
GRANT ALL ON public.shopping_list_items TO service_role;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own list items" ON public.shopping_list_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = list_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.shopping_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));
CREATE TRIGGER trg_list_items_updated BEFORE UPDATE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(12,3) DEFAULT 1,
  unit TEXT,
  purchased_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_items TO authenticated;
GRANT ALL ON public.pantry_items TO service_role;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pantry" ON public.pantry_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_pantry_updated BEFORE UPDATE ON public.pantry_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,           -- INSERT / UPDATE / DELETE
  changed_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- ============================================================================
-- RESERVED FUTURE MODULES (empty scaffolding — do not build UI yet)
-- ============================================================================

CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages household" ON public.households
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Household members read household" ON public.household_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.vision_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  detected JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vision_scans TO authenticated;
GRANT ALL ON public.vision_scans TO service_role;
ALTER TABLE public.vision_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own vision scans" ON public.vision_scans
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.whatsapp_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (phone_e164)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_bindings TO authenticated;
GRANT ALL ON public.whatsapp_bindings TO service_role;
ALTER TABLE public.whatsapp_bindings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own WA bindings" ON public.whatsapp_bindings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.pos_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_syncs TO authenticated;
GRANT ALL ON public.pos_syncs TO service_role;
ALTER TABLE public.pos_syncs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Retailer manages POS syncs" ON public.pos_syncs
  FOR ALL TO authenticated
  USING (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id))
  WITH CHECK (public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id));

CREATE TABLE public.loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  points NUMERIC(14,2) NOT NULL DEFAULT 0,
  tier TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organisation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loyalty_accounts TO authenticated;
GRANT ALL ON public.loyalty_accounts TO service_role;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own loyalty" ON public.loyalty_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role_in_org(auth.uid(), 'retailer_admin', organisation_id));

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  provider TEXT,
  external_id TEXT,
  amount NUMERIC(12,2),
  currency_code TEXT REFERENCES public.currencies(code),
  status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON public.payments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- AUTO-PROVISION on signup: profile + memory + notif prefs + subscriber role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, display_name, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriber_memory (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_prefs (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'subscriber')
  ON CONFLICT (user_id, role, organisation_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SEED REFERENCE DATA (South Africa first, multi-country ready)
-- ============================================================================

INSERT INTO public.currencies (code, name, symbol, decimal_digits) VALUES
  ('ZAR', 'South African Rand', 'R', 2),
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 2),
  ('GBP', 'British Pound', '£', 2),
  ('NGN', 'Nigerian Naira', '₦', 2),
  ('KES', 'Kenyan Shilling', 'KSh', 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.languages (code, name, native_name) VALUES
  ('en-ZA', 'English (South Africa)', 'English'),
  ('af-ZA', 'Afrikaans', 'Afrikaans'),
  ('zu-ZA', 'Zulu', 'isiZulu'),
  ('xh-ZA', 'Xhosa', 'isiXhosa'),
  ('en-US', 'English (US)', 'English'),
  ('en-GB', 'English (UK)', 'English')
ON CONFLICT DO NOTHING;

INSERT INTO public.countries (code, name, currency_code, default_timezone, default_language) VALUES
  ('ZA', 'South Africa', 'ZAR', 'Africa/Johannesburg', 'en-ZA'),
  ('NG', 'Nigeria', 'NGN', 'Africa/Lagos', 'en-GB'),
  ('KE', 'Kenya', 'KES', 'Africa/Nairobi', 'en-GB'),
  ('GB', 'United Kingdom', 'GBP', 'Europe/London', 'en-GB'),
  ('US', 'United States', 'USD', 'America/New_York', 'en-US')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_categories (name, slug, sort_order) VALUES
  ('Fresh Produce', 'fresh-produce', 10),
  ('Meat & Poultry', 'meat-poultry', 20),
  ('Bakery', 'bakery', 30),
  ('Dairy & Eggs', 'dairy-eggs', 40),
  ('Pantry Staples', 'pantry-staples', 50),
  ('Frozen', 'frozen', 60),
  ('Beverages', 'beverages', 70),
  ('Snacks', 'snacks', 80),
  ('Household', 'household', 90),
  ('Personal Care', 'personal-care', 100),
  ('Baby & Kids', 'baby-kids', 110),
  ('Health & Wellness', 'health-wellness', 120)
ON CONFLICT DO NOTHING;
