-- ============================================================================
-- GULAS RESTAURANT PLATFORM — TABELA DE MODIFICADORES DE PRODUTO E RLS
-- Migration: 20261110_product_modifiers.sql
-- Description:
--   1. Cria a tabela public.product_modifiers para suporte a extras pagos,
--      ingredientes removíveis e molhos.
--   2. Define constraints de integridade (price_delta >= 0, group permitido).
--   3. Cria índices de performance para consultas por produto.
--   4. Ativa Row Level Security (RLS) e define políticas de leitura pública
--      (apenas ativos) e gestão restrita ao staff/gestão do restaurante.
--   5. Adiciona trigger para atualização automática de updated_at.
-- ============================================================================

BEGIN;

-- 1. CRIAR TABELA public.product_modifiers
CREATE TABLE IF NOT EXISTS public.product_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    price_delta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    "group" VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_product_modifiers_price_delta CHECK (price_delta >= 0),
    CONSTRAINT check_product_modifiers_group CHECK ("group" IN ('extra', 'remove', 'sauce'))
);

-- 2. TRIGGER PARA updated_at (seguindo o padrão handle_updated_at existente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_product_modifiers_updated_at'
    ) THEN
        CREATE TRIGGER set_product_modifiers_updated_at
            BEFORE UPDATE ON public.product_modifiers
            FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;

-- 3. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_modifiers_product_id
    ON public.product_modifiers(product_id)
    WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_product_modifiers_product_sort
    ON public.product_modifiers(product_id, sort_order);

-- 4. ATIVAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS

-- Leitura pública: clientes consultam apenas modificadores ativos de produtos e restaurantes disponíveis
DROP POLICY IF EXISTS "Public Read Active Product Modifiers" ON public.product_modifiers;
CREATE POLICY "Public Read Active Product Modifiers"
ON public.product_modifiers FOR SELECT
TO anon, authenticated
USING (
    active = true
    AND EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.restaurants r ON r.id = p.restaurant_id
        WHERE p.id = product_modifiers.product_id
          AND p.is_available = true
          AND r.is_active = true
    )
);

-- Gestão por Staff autenticado: apenas membros de staff/gestão do restaurante dono do produto
DROP POLICY IF EXISTS "Staff Manage Product Modifiers" ON public.product_modifiers;
CREATE POLICY "Staff Manage Product Modifiers"
ON public.product_modifiers FOR ALL
TO authenticated
USING (
    product_id IN (
        SELECT pr.id FROM public.products pr
        JOIN public.profiles prof ON prof.restaurant_id = pr.restaurant_id
        WHERE prof.id = auth.uid()
          AND prof.role IN ('owner', 'manager', 'staff')
    )
)
WITH CHECK (
    product_id IN (
        SELECT pr.id FROM public.products pr
        JOIN public.profiles prof ON prof.restaurant_id = pr.restaurant_id
        WHERE prof.id = auth.uid()
          AND prof.role IN ('owner', 'manager', 'staff')
    )
);

-- 6. PERMISSÕES DE TABELA (sem conceder TRUNCATE a authenticated)
GRANT SELECT ON public.product_modifiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_modifiers TO authenticated;
GRANT ALL ON public.product_modifiers TO service_role;

COMMIT;
