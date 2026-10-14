-- ============================================================================
-- GULAS RESTAURANT PLATFORM — AUDITORIA DE SEGURANÇA E REFORÇO RLS
-- Migration: 20261015_security_audit_and_rls_hardening.sql
-- Alvo: Projeto Supabase emjhabwmuvmjwshbkgvt
-- Estado: PREPARADO LOCALMENTE (Não aplicado remotamente sem autorização)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. REVOGAÇÃO DE POLÍTICAS DE LEITURA PÚBLICA INSEGURA (USING true)
-- Elimina o risco de exposição indiscriminada de pedidos de clientes e vendas
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Read Order Items" ON public.order_items;

-- ----------------------------------------------------------------------------
-- 2. ASSEGURAR ROW LEVEL SECURITY ATIVO EM TODAS AS TABELAS SENSÍVEIS
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
-- 3. POLÍTICAS DE STAFF COM ISOLAMENTO ESTRITO POR RESTAURANTE
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

-- Products: Gestão exclusiva pelo staff do respetivo restaurante
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
-- 4. RPC SEGURA PARA CONSULTA DE ESTADO DE PEDIDO PELO CLIENTE (Zero-Trust)
-- Permite que clientes acompanhem o seu pedido sem conceder SELECT aberto
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_order_status(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF p_order_id IS NULL THEN
        RETURN NULL;
    END IF;

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

-- Permissões estritas de execução
REVOKE ALL ON FUNCTION public.get_public_order_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_status(UUID) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. PROTEÇÃO DE DADOS INTERNOS DE PRODUTOS (COLUMN-LEVEL SECURITY)
-- Impede que utilizadores anónimos acedam ao campo `cost` (custo financeiro)
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.products FROM anon;
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
) ON public.products TO anon;

COMMIT;

-- ============================================================================
-- PROCEDIMENTO DE ROLLBACK (Reversão para o estado anterior caso necessário)
-- ============================================================================
-- BEGIN;
-- CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "Public Read Order Items" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
-- GRANT SELECT ON public.products TO anon;
-- DROP FUNCTION IF EXISTS public.get_public_order_status(UUID);
-- COMMIT;
