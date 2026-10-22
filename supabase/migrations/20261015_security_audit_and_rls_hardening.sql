-- ============================================================================
-- GULAS RESTAURANT PLATFORM — AUDITORIA DE SEGURANÇA E REFORÇO RLS
-- Migration: 20261015_security_audit_and_rls_hardening.sql
-- Alvo: Projeto Supabase emjhabwmuvmjwshbkgvt
-- Estado: PROPOSTA / ESPECIFICADA LOCALMENTE (NÃO APLICADA REMOTAMENTE)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. REVOGAÇÃO DE POLÍTICAS DE LEITURA PÚBLICA INDISCRIMINADA (USING true)
-- Elimina a exposição indevida da tabela de pedidos e artigos
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Read Order Items" ON public.order_items;

-- ----------------------------------------------------------------------------
-- 2. ASSEGURAR ROW LEVEL SECURITY ATIVO EM TODAS AS TABELAS DO SISTEMA
-- ----------------------------------------------------------------------------
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. PROTEÇÃO DO PERFIL DE STAFF CONTRA AUTOALTERAÇÃO DE TENANT E ROLE
-- Impede que um utilizador comum autenticado altere o seu restaurant_id ou
-- se promova a "owner" via API de cliente Supabase.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.restaurant_id IS DISTINCT FROM NEW.restaurant_id) THEN
        RAISE EXCEPTION 'VIOLATION_TENANT: Não é permitido alterar o restaurante associado ao perfil.' USING ERRCODE = '42501';
    END IF;
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
        RAISE EXCEPTION 'VIOLATION_ROLE: Não é permitido alterar o cargo/papel atribuído ao perfil.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trigger_protect_profile_privileges
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- ----------------------------------------------------------------------------
-- 4. POLÍTICAS DE STAFF COM ISOLAMENTO ESTRITO POR RESTAURANTE E PAPEL
-- Garante que membros de um restaurante nunca acedem a dados de outro
-- ----------------------------------------------------------------------------

-- Orders: Apenas staff do restaurante correspondente
DROP POLICY IF EXISTS "Staff Manage Orders" ON public.orders;
CREATE POLICY "Staff Manage Orders"
ON public.orders FOR ALL
TO authenticated
USING (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);

-- Order Items: Apenas itens de pedidos do restaurante do staff autenticado
DROP POLICY IF EXISTS "Staff Manage Order Items" ON public.order_items;
CREATE POLICY "Staff Manage Order Items"
ON public.order_items FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
        WHERE p.id = auth.uid()
    )
)
WITH CHECK (
    order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
        WHERE p.id = auth.uid()
    )
);

-- Products: Gestão exclusiva pelo staff/owner do respetivo restaurante
DROP POLICY IF EXISTS "Staff Manage Products" ON public.products;
CREATE POLICY "Staff Manage Products"
ON public.products FOR ALL
TO authenticated
USING (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);

-- ----------------------------------------------------------------------------
-- 5. MECANISMO DE AUTORIZAÇÃO DE ACOMPANHAMENTO: TOKEN DE ACOMPANHAMENTO
-- Adiciona client_tracking_token aleatório de alta entropia para validação de
-- propriedade/autorização real pelo cliente que realizou o pedido.
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64) DEFAULT encode(gen_random_bytes(32), 'hex');

-- RPC protegida que exige ID e tracking_token válido (ou sessão de staff do restaurante)
CREATE OR REPLACE FUNCTION public.get_public_order_status(
    p_order_id UUID,
    p_tracking_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
    v_is_staff BOOLEAN := false;
BEGIN
    IF p_order_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Verificar se é staff autenticado do próprio restaurante
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
            WHERE o.id = p_order_id AND p.id = auth.uid()
        ) INTO v_is_staff;
    END IF;

    -- Se não for staff do restaurante, exige o tracking_token correspondente
    IF NOT v_is_staff THEN
        IF p_tracking_token IS NULL OR trim(p_tracking_token) = '' THEN
            RETURN NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = p_order_id AND tracking_token = trim(p_tracking_token)
        ) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- Projeção estrita dos dados de acompanhamento (sem custos internos)
    SELECT jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'table_number', o.table_number,
        'status', o.status,
        'subtotal', o.subtotal,
        'total', o.total,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'items', COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'product_name', oi.product_name,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'notes', oi.notes
                    )
                )
                FROM public.order_items oi
                WHERE oi.order_id = o.id
            ),
            '[]'::jsonb
        )
    )
    INTO v_result
    FROM public.orders o
    WHERE o.id = p_order_id;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_status(UUID, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. PROTEÇÃO DE CUSTOS DE PRODUTOS (COLUMN-LEVEL SECURITY)
-- Impede que anónimos ou staff de outros restaurantes leiam a coluna `cost`
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.products FROM anon;
GRANT ALL ON public.products TO authenticated;
GRANT SELECT (
    id,
    restaurant_id,
    category_id,
    name,
    slug,
    description,
    price,
    image_url,
    is_available,
    display_order,
    badges,
    unit_quantity,
    includes_notes,
    customization_note,
    allergens,
    prep_time_minutes,
    created_at,
    updated_at
) ON public.products TO anon, authenticated;

COMMIT;

-- ============================================================================
-- PROCEDIMENTO DE ROLLBACK
-- ============================================================================
-- BEGIN;
-- CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "Public Read Order Items" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
-- GRANT ALL ON public.products TO authenticated;
-- GRANT SELECT ON public.products TO anon;
-- DROP TRIGGER IF EXISTS trigger_protect_profile_privileges ON public.profiles;
-- DROP FUNCTION IF EXISTS public.protect_profile_privileges();
-- DROP FUNCTION IF EXISTS public.get_public_order_status(UUID, TEXT);
-- COMMIT;
