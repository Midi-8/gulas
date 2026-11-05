-- ============================================================================
-- GULAS RESTAURANT PLATFORM — INITIAL DATABASE SCHEMA
-- Migration: 20260928_initial_schema.sql
-- ============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. FUNÇÃO TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. TABELA: RESTAURANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    tagline VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    logo_url TEXT,
    cover_image_url TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Lisbon',
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_open BOOLEAN NOT NULL DEFAULT true,
    opening_hours VARCHAR(100) DEFAULT '12:00 – 15:00 • 19:00 – 23:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. TABELA: PROFILES (Membros de Staff / Gestão associados a auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. TABELA: CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    subtitle VARCHAR(255),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_specialty BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_restaurant_category_slug UNIQUE (restaurant_id, slug)
);

CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. TABELA: PRODUCTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    cost NUMERIC(10,2) CHECK (cost IS NULL OR cost >= 0),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    unit_quantity VARCHAR(50),
    includes_notes VARCHAR(255),
    customization_note VARCHAR(255),
    allergens TEXT[] DEFAULT '{}',
    prep_time_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_restaurant_product_slug UNIQUE (restaurant_id, slug)
);

CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. TABELA: TABLES (Mesas do Restaurante)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    qr_token VARCHAR(100) UNIQUE DEFAULT uuid_generate_v4()::text,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_restaurant_table_number UNIQUE (restaurant_id, number)
);

CREATE TRIGGER set_tables_updated_at
    BEFORE UPDATE ON public.tables
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 8. TABELA: RESTAURANT_COUNTERS (Contador de Pedidos por Restaurante)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_counters (
    restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
    last_order_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Função atómica protegida contra concorrência para gerar números de pedido
CREATE OR REPLACE FUNCTION public.get_next_order_number(p_restaurant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    INSERT INTO public.restaurant_counters (restaurant_id, last_order_number, updated_at)
    VALUES (p_restaurant_id, 1, NOW())
    ON CONFLICT (restaurant_id) DO UPDATE
    SET last_order_number = public.restaurant_counters.last_order_number + 1,
        updated_at = NOW()
    RETURNING last_order_number INTO v_next_number;

    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 9. TABELA: ORDERS (Estrutura Preparada para os Próximos Milestones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    table_number INTEGER NOT NULL,
    order_number INTEGER NOT NULL,
    tracking_token VARCHAR(64) DEFAULT encode(gen_random_bytes(32), 'hex'),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    customer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 10. TABELA: ORDER_ITEMS (Snapshots Imutáveis das Linhas de Pedido)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(10,2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. ÍNDICES DE PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_order ON public.categories(restaurant_id, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_restaurant_category ON public.products(restaurant_id, category_id, display_order) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_number ON public.tables(restaurant_id, number) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON public.tables(qr_token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- POLÍTICAS: RESTAURANTS
-- ----------------------------------------------------------------------------
-- Público (Clientes / Menu): Apenas restaurantes ativos
CREATE POLICY "Public Read Active Restaurants"
ON public.restaurants FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Staff: Gestão do seu próprio restaurante
CREATE POLICY "Staff Manage Own Restaurant"
ON public.restaurants FOR ALL
TO authenticated
USING (
    id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: PROFILES
-- ----------------------------------------------------------------------------
-- Utilizadores autenticados podem consultar apenas o seu próprio perfil ou perfis do mesmo restaurante
CREATE POLICY "Users Read Own Profile and Colleagues"
ON public.profiles FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Users Update Own Profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------------------
-- POLÍTICAS: CATEGORIES
-- ----------------------------------------------------------------------------
-- Público: Categorias ativas de restaurantes ativos
CREATE POLICY "Public Read Active Categories"
ON public.categories FOR SELECT
TO anon, authenticated
USING (
    is_active = true
    AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = categories.restaurant_id
        AND r.is_active = true
    )
);

-- Staff: Gestão total de categorias do seu restaurante
CREATE POLICY "Staff Manage Categories"
ON public.categories FOR ALL
TO authenticated
USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: PRODUCTS
-- ----------------------------------------------------------------------------
-- Público: Produtos disponíveis de categorias ativas e restaurantes ativos
CREATE POLICY "Public Read Active Products"
ON public.products FOR SELECT
TO anon, authenticated
USING (
    is_available = true
    AND EXISTS (
        SELECT 1 FROM public.categories c
        JOIN public.restaurants r ON r.id = c.restaurant_id
        WHERE c.id = products.category_id
        AND c.is_active = true
        AND r.is_active = true
    )
);

-- Staff: Gestão total de produtos do seu restaurante
CREATE POLICY "Staff Manage Products"
ON public.products FOR ALL
TO authenticated
USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: TABLES
-- ----------------------------------------------------------------------------
-- Público: Mesas ativas de restaurantes ativos (necessário para validação de rota de mesa)
CREATE POLICY "Public Read Active Tables"
ON public.tables FOR SELECT
TO anon, authenticated
USING (
    is_active = true
    AND EXISTS (
        SELECT 1 FROM public.restaurants r
        WHERE r.id = tables.restaurant_id
        AND r.is_active = true
    )
);

-- Staff: Gestão total de mesas do seu restaurante
CREATE POLICY "Staff Manage Tables"
ON public.tables FOR ALL
TO authenticated
USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: RESTAURANT_COUNTERS
-- ----------------------------------------------------------------------------
-- Acesso restrito ao Staff autenticado do restaurante
CREATE POLICY "Staff Read Counters"
ON public.restaurant_counters FOR SELECT
TO authenticated
USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- ----------------------------------------------------------------------------
-- POLÍTICAS: ORDERS & ORDER_ITEMS
-- ----------------------------------------------------------------------------
-- Staff: Acesso total aos pedidos do seu restaurante
CREATE POLICY "Staff Manage Orders"
ON public.orders FOR ALL
TO authenticated
USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
);

CREATE POLICY "Staff Manage Order Items"
ON public.order_items FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
        WHERE p.id = auth.uid()
    )
);
