-- ============================================================================
-- GULAS RESTAURANT PLATFORM — PERSISTÊNCIA DE MODIFICADORES E RPC TRANSACIONAL
-- Migration: 20261110_create_order_atomic_modifiers.sql
-- Description:
--   1. Adiciona as colunas selected_modifiers (JSONB) e modifiers_summary (TEXT)
--      à tabela public.order_items.
--   2. Concede permissões explícitas de leitura (Column-Level Security).
--   3. Insere seeds idempotentes dos modificadores com UUIDs determinísticos
--      e validação estrita de compatibilidade de negócio (ex: Veg Burger sem carne,
--      sem pão tostado em caracóizzz, sem carne em pizzas vegetarianas).
--   4. Atualiza a RPC atómica public.create_order_atomic para receber modifier_ids,
--      validar integridade e recálculo de preços no servidor com segurança Zero-Trust.
-- ============================================================================

BEGIN;

-- 1. ADICIONAR COLUNAS EM public.order_items (IDEMPOTENTE E NÃO-DESTRUTIVO)
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS selected_modifiers JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS modifiers_summary TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.product_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price_delta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    "group" TEXT NOT NULL CHECK ("group" IN ('extra', 'remove', 'sauce')),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_modifiers_product_id
ON public.product_modifiers(product_id);

CREATE TABLE IF NOT EXISTS public.product_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price_delta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    "group" TEXT NOT NULL CHECK ("group" IN ('extra', 'remove', 'sauce')),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_modifiers_product_id
ON public.product_modifiers(product_id);

CREATE TABLE IF NOT EXISTS public.product_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    price_delta NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    "group" TEXT NOT NULL CHECK ("group" IN ('extra', 'remove', 'sauce')),
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to product modifiers"
ON public.product_modifiers;

CREATE POLICY "Public read access to product modifiers"
ON public.product_modifiers
FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_product_modifiers_product_id
ON public.product_modifiers(product_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'product_modifiers_price_delta_check'
    ) THEN
        ALTER TABLE public.product_modifiers
            ADD CONSTRAINT product_modifiers_price_delta_check
            CHECK (price_delta >= 0 AND price_delta <= 50);
    END IF;
END $$;

-- 2. PERMISSÕES DE LEITURA (COLUMN-LEVEL SECURITY)
GRANT SELECT (selected_modifiers, modifiers_summary)
ON TABLE public.order_items
TO anon, authenticated;

-- 3. SEEDS DETERMINÍSTICOS COM MATRIZ DE COMPATIBILIDADE DE NEGÓCIO

-- Helper temporário para inserção limpa e idempotente de modificadores
CREATE OR REPLACE FUNCTION pg_temp.seed_modifier(
    p_product_id UUID,
    p_sort_idx INTEGER,
    p_label TEXT,
    p_price_delta NUMERIC,
    p_group TEXT
)
RETURNS VOID AS $$
DECLARE
    v_prod_num TEXT;
    v_mod_id UUID;
BEGIN
    v_prod_num := substring(p_product_id::text from 10 for 4);
    v_mod_id := ('d1111111-' || v_prod_num || '-4000-8000-' || lpad(p_sort_idx::text, 12, '0'))::UUID;

    INSERT INTO public.product_modifiers (
        id,
        product_id,
        label,
        price_delta,
        "group",
        active,
        sort_order
    ) VALUES (
        v_mod_id,
        p_product_id,
        p_label,
        p_price_delta,
        p_group,
        true,
        p_sort_idx
    )
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    r_prod RECORD;
BEGIN
    -- -------------------------------------------------------------------------
    -- A. BURGERS
    -- -------------------------------------------------------------------------

    -- 1. São Miguel Burger (b1111111-0084-4000-8000-000000000084)
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 1, 'Sem cebola', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 2, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 3, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 4, 'Sem bacon', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 5, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 6, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 7, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 8, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 9, 'Cogumelos Shitake', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 10, 'Extra Carne Bovina', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0084-4000-8000-000000000084'::uuid, 11, 'Molho da casa extra', 0.50, 'sauce');

    -- 2. Cheeseburger Bacon Edition (b1111111-0085-4000-8000-000000000085)
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 1, 'Sem pickles', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 2, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 3, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 4, 'Sem bacon', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 5, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 6, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 7, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 8, 'Extra Carne Bovina', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0085-4000-8000-000000000085'::uuid, 9, 'Molho da casa extra', 0.50, 'sauce');

    -- 3. Gulas Burger (b1111111-0086-4000-8000-000000000086)
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 1, 'Sem cebola', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 2, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 3, 'Sem bacon', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 4, 'Sem cogumelos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 5, 'Sem ovo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 6, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 7, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 8, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 9, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 10, 'Cogumelos Shitake', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 11, 'Extra Carne Bovina', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0086-4000-8000-000000000086'::uuid, 12, 'Molho da casa extra', 0.50, 'sauce');

    -- 4. Classic 2.0 (b1111111-0087-4000-8000-000000000087)
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 1, 'Sem cebola', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 2, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 3, 'Sem tomate', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 4, 'Sem alface', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 5, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 6, 'Sem bacon', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 7, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 8, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 9, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 10, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 11, 'Cogumelos Shitake', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 12, 'Extra Carne Bovina', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0087-4000-8000-000000000087'::uuid, 13, 'Molho da casa extra', 0.50, 'sauce');

    -- 5. Mostarda’s (b1111111-0088-4000-8000-000000000088)
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 1, 'Sem cebola', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 2, 'Sem mostarda', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 3, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 4, 'Sem presunto', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 5, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 6, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 7, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 8, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 9, 'Extra Carne Bovina', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0088-4000-8000-000000000088'::uuid, 10, 'Molho da casa extra', 0.50, 'sauce');

    -- 6. Frango Burger (b1111111-0089-4000-8000-000000000089 - Sem Extra Carne Bovina)
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 1, 'Sem cebola', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 2, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 3, 'Sem alface', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 4, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 5, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 6, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 7, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 8, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0089-4000-8000-000000000089'::uuid, 9, 'Molho da casa extra', 0.50, 'sauce');

    -- 7. SPICY CHICKEN (b1111111-0090-4000-8000-000000000090 - Sem Extra Carne Bovina)
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 1, 'Sem picante', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 2, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 3, 'Sem rúcula', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 4, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 5, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 6, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 7, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 8, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0090-4000-8000-000000000090'::uuid, 9, 'Molho da casa extra', 0.50, 'sauce');

    -- 8. Veg Burger (b1111111-0091-4000-8000-000000000091 - Vegetariano Estrito: SEM CARNE, SEM BACON)
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 1, 'Sem cebola', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 2, 'Sem cogumelos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 3, 'Sem tomate', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 4, 'Sem rúcula', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 5, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 6, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 7, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 8, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 9, 'Cogumelos Shitake', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0091-4000-8000-000000000091'::uuid, 10, 'Molho da casa extra', 0.50, 'sauce');

    -- 9. Cheese Burger (b1111111-0092-4000-8000-000000000092)
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 1, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 2, 'Sem pickles', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 3, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 4, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 5, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 6, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 7, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 8, 'Extra Carne Bovina', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0092-4000-8000-000000000092'::uuid, 9, 'Molho da casa extra', 0.50, 'sauce');

    -- 10. Classic Burger (b1111111-0093-4000-8000-000000000093)
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 1, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 2, 'Sem fiambre', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 3, 'Sem alface', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 4, 'Sem tomate', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 5, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 6, 'Extra Cheddar', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 7, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 8, 'Cebola caramelizada', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 9, 'Extra Carne Bovina', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0093-4000-8000-000000000093'::uuid, 10, 'Molho da casa extra', 0.50, 'sauce');

    -- -------------------------------------------------------------------------
    -- B. PREGOS (Extra Bife e Queijo da Ilha aplicáveis)
    -- -------------------------------------------------------------------------

    -- 1. Prego no Caco (b1111111-0101-4000-8000-000000000101)
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 1, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 2, 'Sem fiambre', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 3, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 4, 'Extra Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 5, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 6, 'Extra Queijo da Ilha', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 7, 'Extra Bife', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0101-4000-8000-000000000101'::uuid, 8, 'Molho de mostarda antiga', 0.50, 'sauce');

    -- 2. PREGO 2.0 (b1111111-0102-4000-8000-000000000102)
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 1, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 2, 'Sem bacon', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 3, 'Sem ovo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 4, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 5, 'Extra Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 6, 'Extra Bacon', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 7, 'Extra Queijo da Ilha', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 8, 'Extra Bife', 2.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0102-4000-8000-000000000102'::uuid, 9, 'Molho de mostarda antiga', 0.50, 'sauce');

    -- -------------------------------------------------------------------------
    -- C. PANUOZZOS
    -- -------------------------------------------------------------------------

    -- 1. Panuozzo Caprese (b1111111-0043-4000-8000-000000000043 - Vegetariano: sem carne)
    PERFORM pg_temp.seed_modifier('b1111111-0043-4000-8000-000000000043'::uuid, 1, 'Sem tomate', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0043-4000-8000-000000000043'::uuid, 2, 'Sem rúcula', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0043-4000-8000-000000000043'::uuid, 3, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0043-4000-8000-000000000043'::uuid, 4, 'Sem mozzarella', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0043-4000-8000-000000000043'::uuid, 5, 'Extra Mozzarella', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0043-4000-8000-000000000043'::uuid, 6, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0043-4000-8000-000000000043'::uuid, 7, 'Molho de alho extra', 0.50, 'sauce');

    -- 2. Panuozzo Iberico (b1111111-0044-4000-8000-000000000044)
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 1, 'Sem presunto', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 2, 'Sem queijo', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 3, 'Sem rúcula', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 4, 'Sem molho', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 5, 'Extra Mozzarella', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 6, 'Extra Bacon', 1.30, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 7, 'Extra Prosciutto', 1.50, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 8, 'Ovo', 1.00, 'extra');
    PERFORM pg_temp.seed_modifier('b1111111-0044-4000-8000-000000000044'::uuid, 9, 'Molho de alho extra', 0.50, 'sauce');

    -- -------------------------------------------------------------------------
    -- D. CARACÓIZZZ (Sem "pão tostado", molhos coerentes)
    -- -------------------------------------------------------------------------

    -- 1. Caracóizz ao Alho (b1111111-0035-4000-8000-000000000035)
    PERFORM pg_temp.seed_modifier('b1111111-0035-4000-8000-000000000035'::uuid, 1, 'Sem orégãos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0035-4000-8000-000000000035'::uuid, 2, 'Molho de alho extra', 0.80, 'sauce');

    -- 2. Caracóizz Clássicos (b1111111-0036-4000-8000-000000000036)
    PERFORM pg_temp.seed_modifier('b1111111-0036-4000-8000-000000000036'::uuid, 1, 'Sem fiambre', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0036-4000-8000-000000000036'::uuid, 2, 'Sem orégãos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0036-4000-8000-000000000036'::uuid, 3, 'Molho de alho extra', 0.80, 'sauce');

    -- 3. Caracóizz Genovese (b1111111-0037-4000-8000-000000000037)
    PERFORM pg_temp.seed_modifier('b1111111-0037-4000-8000-000000000037'::uuid, 1, 'Sem tomate cherry', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0037-4000-8000-000000000037'::uuid, 2, 'Sem orégãos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0037-4000-8000-000000000037'::uuid, 3, 'Molho de alho extra', 0.80, 'sauce');

    -- 4. Caracóizz Vegan (b1111111-0038-4000-8000-000000000038 - Vegan estrito)
    PERFORM pg_temp.seed_modifier('b1111111-0038-4000-8000-000000000038'::uuid, 1, 'Sem cebola', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0038-4000-8000-000000000038'::uuid, 2, 'Sem pimentos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0038-4000-8000-000000000038'::uuid, 3, 'Sem cogumelos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0038-4000-8000-000000000038'::uuid, 4, 'Molho de alho extra', 0.80, 'sauce');

    -- 5. Caracóizz Mexicanos (b1111111-0039-4000-8000-000000000039)
    PERFORM pg_temp.seed_modifier('b1111111-0039-4000-8000-000000000039'::uuid, 1, 'Sem picante', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0039-4000-8000-000000000039'::uuid, 2, 'Sem jalapeño', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0039-4000-8000-000000000039'::uuid, 3, 'Sem orégãos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0039-4000-8000-000000000039'::uuid, 4, 'Molho cheddar extra', 0.80, 'sauce');

    -- 6. Caracóizz Cheddar e Bacon (b1111111-0040-4000-8000-000000000040)
    PERFORM pg_temp.seed_modifier('b1111111-0040-4000-8000-000000000040'::uuid, 1, 'Sem bacon', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0040-4000-8000-000000000040'::uuid, 2, 'Sem orégãos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0040-4000-8000-000000000040'::uuid, 3, 'Molho cheddar extra', 0.80, 'sauce');

    -- 7. CARACÓIZZ POPULARES (b1111111-0041-4000-8000-000000000041)
    PERFORM pg_temp.seed_modifier('b1111111-0041-4000-8000-000000000041'::uuid, 1, 'Sem cebola granulada', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0041-4000-8000-000000000041'::uuid, 2, 'Sem chourição', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0041-4000-8000-000000000041'::uuid, 3, 'Sem orégãos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0041-4000-8000-000000000041'::uuid, 4, 'Molho de alho extra', 0.80, 'sauce');

    -- 8. Caracóizz Turcos (b1111111-0042-4000-8000-000000000042)
    PERFORM pg_temp.seed_modifier('b1111111-0042-4000-8000-000000000042'::uuid, 1, 'Sem picante', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0042-4000-8000-000000000042'::uuid, 2, 'Sem orégãos', 0.00, 'remove');
    PERFORM pg_temp.seed_modifier('b1111111-0042-4000-8000-000000000042'::uuid, 3, 'Molho de alho extra', 0.80, 'sauce');

    -- -------------------------------------------------------------------------
    -- E. PIZZAS (Clássicas & Especiais com distinção Vegetariana vs Carne vs Peixe)
    -- -------------------------------------------------------------------------

    -- 1. Pizzas Vegetarianas / Queijo
    -- Vegetariana (0057, 0058), Clássica (0063, 0064), A Mais Formosa (0055, 0056), Margarida (0067), Romão (0069)
    FOR r_prod IN
        SELECT id FROM public.products
        WHERE id IN (
            'b1111111-0057-4000-8000-000000000057'::uuid, 'b1111111-0058-4000-8000-000000000058'::uuid,
            'b1111111-0063-4000-8000-000000000063'::uuid, 'b1111111-0064-4000-8000-000000000064'::uuid,
            'b1111111-0055-4000-8000-000000000055'::uuid, 'b1111111-0056-4000-8000-000000000056'::uuid,
            'b1111111-0067-4000-8000-000000000067'::uuid, 'b1111111-0069-4000-8000-000000000069'::uuid
        )
    LOOP
        PERFORM pg_temp.seed_modifier(r_prod.id, 1, 'Sem cebola', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 2, 'Sem orégãos', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 3, 'Sem azeitonas', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 4, 'Sem cogumelos', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 5, 'Sem mozzarella', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 6, 'Extra Mozzarella', 1.00, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 7, 'Ovo', 1.00, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 8, 'Queijo Parmesão', 0.80, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 9, 'Burrata de leite italiano', 3.40, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 10, 'Azeite trufado', 0.50, 'sauce');
    END LOOP;

    -- 2. Pizzas de Peixe (Pescador 0051, 0052; Dos Camarões 0071)
    FOR r_prod IN
        SELECT id FROM public.products
        WHERE id IN (
            'b1111111-0051-4000-8000-000000000051'::uuid, 'b1111111-0052-4000-8000-000000000052'::uuid,
            'b1111111-0071-4000-8000-000000000071'::uuid
        )
    LOOP
        PERFORM pg_temp.seed_modifier(r_prod.id, 1, 'Sem cebola', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 2, 'Sem orégãos', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 3, 'Sem azeitonas', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 4, 'Sem mozzarella', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 5, 'Extra Mozzarella', 1.00, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 6, 'Ovo', 1.00, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 7, 'Queijo Parmesão', 0.80, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 8, 'Burrata de leite italiano', 3.40, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 9, 'Azeite trufado', 0.50, 'sauce');
    END LOOP;

    -- 3. Pizzas Tradicionais com Carne (todas as restantes)
    FOR r_prod IN
        SELECT id FROM public.products
        WHERE id IN (
            'b1111111-0045-4000-8000-000000000045'::uuid, 'b1111111-0046-4000-8000-000000000046'::uuid, -- Gulas
            'b1111111-0047-4000-8000-000000000047'::uuid, 'b1111111-0048-4000-8000-000000000048'::uuid, -- Pepe
            'b1111111-0049-4000-8000-000000000049'::uuid, 'b1111111-0050-4000-8000-000000000050'::uuid, -- Tabasco
            'b1111111-0053-4000-8000-000000000053'::uuid, 'b1111111-0054-4000-8000-000000000054'::uuid, -- Salamandra
            'b1111111-0059-4000-8000-000000000059'::uuid, 'b1111111-0060-4000-8000-000000000060'::uuid, -- Kebab
            'b1111111-0061-4000-8000-000000000061'::uuid, 'b1111111-0062-4000-8000-000000000062'::uuid, -- A Polémica
            'b1111111-0065-4000-8000-000000000065'::uuid, 'b1111111-0066-4000-8000-000000000066'::uuid, -- Mista
            'b1111111-0068-4000-8000-000000000068'::uuid, -- PEPE DO BOSQUE
            'b1111111-0070-4000-8000-000000000070'::uuid, -- Ibérica
            'b1111111-0072-4000-8000-000000000072'::uuid  -- Calzone
        )
    LOOP
        PERFORM pg_temp.seed_modifier(r_prod.id, 1, 'Sem cebola', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 2, 'Sem orégãos', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 3, 'Sem azeitonas', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 4, 'Sem cogumelos', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 5, 'Sem mozzarella', 0.00, 'remove');
        PERFORM pg_temp.seed_modifier(r_prod.id, 6, 'Extra Mozzarella', 1.00, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 7, 'Extra Bacon', 1.30, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 8, 'Extra Pepperoni', 2.00, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 9, 'Ovo', 1.00, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 10, 'Queijo Parmesão', 0.80, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 11, 'Burrata de leite italiano', 3.40, 'extra');
        PERFORM pg_temp.seed_modifier(r_prod.id, 12, 'Azeite trufado', 0.50, 'sauce');
    END LOOP;
END $$;

-- 4. ATUALIZAR RPC TRANSACIONAL public.create_order_atomic
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_restaurant_slug TEXT,
    p_table_number INTEGER,
    p_customer_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_restaurant RECORD;
    v_table RECORD;
    v_table_id UUID := NULL;
    v_table_name TEXT := 'Take-away';
    v_order_id UUID;
    v_order_number INTEGER;
    v_created_at TIMESTAMPTZ;
    v_tracking_token VARCHAR(64);
    v_subtotal NUMERIC(10,2) := 0.00;
    v_total NUMERIC(10,2) := 0.00;
    v_item JSONB;
    v_product_id_text TEXT;
    v_product_id UUID;
    v_quantity INTEGER;
    v_item_notes TEXT;
    v_product RECORD;
    v_order_item_id UUID;
    v_final_product_name TEXT;
    v_returned_items JSONB := '[]'::jsonb;
    v_item_response JSONB;
    v_items_count INTEGER;

    -- Variáveis para validação e recálculo de modificadores
    v_modifier_ids_json JSONB;
    v_modifier_uuids UUID[];
    v_modifier_uuid_elem TEXT;
    v_parsed_uuid UUID;
    v_mods_count INTEGER;
    v_mods_price_delta NUMERIC(10,2);
    v_mods_all_active BOOLEAN;
    v_item_unit_price NUMERIC(10,2);
    v_selected_modifiers_snapshot JSONB;
    v_modifiers_summary_text TEXT;
BEGIN
    -- 1. Validação de slug do restaurante
    IF p_restaurant_slug IS NULL OR trim(p_restaurant_slug) = '' THEN
        RAISE EXCEPTION 'RESTAURANT_NOT_FOUND: Slug do restaurante não fornecido.' USING ERRCODE = 'P0001';
    END IF;

    SELECT id, name, slug, is_active, is_open
    INTO v_restaurant
    FROM public.restaurants
    WHERE slug = trim(p_restaurant_slug);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'RESTAURANT_NOT_FOUND: Restaurante com o slug "%" não foi encontrado.', p_restaurant_slug USING ERRCODE = 'P0001';
    END IF;

    IF NOT v_restaurant.is_active THEN
        RAISE EXCEPTION 'RESTAURANT_INACTIVE: O restaurante "%" encontra-se inativo no sistema.', v_restaurant.name USING ERRCODE = 'P0001';
    END IF;

    IF NOT v_restaurant.is_open THEN
        RAISE EXCEPTION 'RESTAURANT_CLOSED: O restaurante "%" encontra-se encerrado de momento.', v_restaurant.name USING ERRCODE = 'P0001';
    END IF;

    -- 2. Validação de mesa / Take-Away
    IF p_table_number IS NULL OR p_table_number < 0 THEN
        RAISE EXCEPTION 'TABLE_INVALID: Número da mesa inválido.' USING ERRCODE = 'P0001';
    END IF;

    IF p_table_number = 0 THEN
        v_table_id := NULL;
        v_table_name := 'Take-away';
    ELSE
        SELECT id, number, name, is_active
        INTO v_table
        FROM public.tables
        WHERE restaurant_id = v_restaurant.id
          AND number = p_table_number;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'TABLE_INVALID: A Mesa % não existe no restaurante %.', p_table_number, v_restaurant.name USING ERRCODE = 'P0001';
        END IF;

        IF NOT v_table.is_active THEN
            RAISE EXCEPTION 'TABLE_INVALID: A Mesa % encontra-se desativada de momento.', p_table_number USING ERRCODE = 'P0001';
        END IF;

        v_table_id := v_table.id;
        v_table_name := v_table.name;
    END IF;

    -- 3. Validação das observações gerais
    IF p_customer_notes IS NOT NULL AND length(trim(p_customer_notes)) > 1000 THEN
        RAISE EXCEPTION 'INVALID_NOTES: As observações gerais excedem o limite de 1000 caracteres.' USING ERRCODE = 'P0001';
    END IF;

    -- 4. Validação de formato da lista de artigos
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'EMPTY_CART: Formato de artigos inválido.' USING ERRCODE = 'P0001';
    END IF;

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: O carrinho está vazio.' USING ERRCODE = 'P0001';
    END IF;

    IF v_items_count > 50 THEN
        RAISE EXCEPTION 'CART_LIMIT_EXCEEDED: Limite máximo de 50 artigos distintos por pedido excedido.' USING ERRCODE = 'P0001';
    END IF;

    -- 5. PRIMEIRO PASSO: VALIDAÇÃO TOTAL DE PRODUTOS, MODIFICADORES E CÁLCULO DE SUBTOTAIS
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id_text := v_item->>'product_id';
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_item_notes := v_item->>'notes';

        IF v_product_id_text IS NULL THEN
            RAISE EXCEPTION 'PRODUCT_INVALID: Identificador de artigo ausente.' USING ERRCODE = 'P0001';
        END IF;

        BEGIN
            v_product_id := v_product_id_text::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'PRODUCT_INVALID: Formato de UUID do artigo inválido.' USING ERRCODE = 'P0001';
        END;

                IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 50 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: A quantidade do artigo deve estar entre 1 e 50.' USING ERRCODE = 'P0001';
        END IF;

                IF v_item_notes IS NOT NULL AND length(trim(v_item_notes)) > 500 THEN
            RAISE EXCEPTION 'INVALID_NOTES: As observações do artigo excedem o limite de 500 caracteres.' USING ERRCODE = 'P0001';
        END IF;


        SELECT id, name, price, cost, is_available, unit_quantity
        INTO v_product
        FROM public.products
        WHERE id = v_product_id
          AND restaurant_id = v_restaurant.id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_INVALID: Artigo não encontrado no menu do restaurante.' USING ERRCODE = 'P0001';
        END IF;

        IF NOT v_product.is_available THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: O artigo "%" não se encontra disponível de momento.', v_product.name USING ERRCODE = 'P0001';
        END IF;

        -- Processamento de modificadores do item
        v_modifier_ids_json := v_item->'modifier_ids';
        v_modifier_uuids := ARRAY[]::UUID[];
        v_mods_price_delta := 0.00;

        IF v_modifier_ids_json IS NOT NULL AND jsonb_typeof(v_modifier_ids_json) = 'array' AND jsonb_array_length(v_modifier_ids_json) > 0 THEN
            -- Converter elementos em array de UUID
            FOR v_modifier_uuid_elem IN SELECT jsonb_array_elements_text(v_modifier_ids_json)
            LOOP
                BEGIN
                    v_parsed_uuid := v_modifier_uuid_elem::UUID;
                EXCEPTION WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'MODIFIER_INVALID: Formato de UUID de modificador inválido.' USING ERRCODE = 'P0001';
                END;
                v_modifier_uuids := array_append(v_modifier_uuids, v_parsed_uuid);
            END LOOP;

            -- Verificar duplicados intra-item
            IF array_length(v_modifier_uuids, 1) <> (SELECT count(DISTINCT u) FROM unnest(v_modifier_uuids) AS u) THEN
                RAISE EXCEPTION 'DUPLICATE_MODIFIER: Modificadores duplicados no mesmo artigo.' USING ERRCODE = 'P0001';
            END IF;

            -- Validar existência, pertença ao produto e estado ativo
            SELECT
                count(*),
                COALESCE(sum(price_delta), 0.00),
                bool_and(active)
            INTO
                v_mods_count,
                v_mods_price_delta,
                v_mods_all_active
            FROM public.product_modifiers
            WHERE id = ANY(v_modifier_uuids)
              AND product_id = v_product_id;

            IF v_mods_count <> array_length(v_modifier_uuids, 1) THEN
                RAISE EXCEPTION 'MODIFIER_INVALID: Um ou mais modificadores não pertencem ao artigo ou não existem.' USING ERRCODE = 'P0001';
            END IF;

            IF NOT v_mods_all_active THEN
                RAISE EXCEPTION 'MODIFIER_UNAVAILABLE: Um ou mais modificadores encontram-se indisponíveis de momento.' USING ERRCODE = 'P0001';
            END IF;
        END IF;

        v_item_unit_price := v_product.price + v_mods_price_delta;
        v_subtotal := v_subtotal + (v_item_unit_price * v_quantity);
    END LOOP;

    v_total := v_subtotal;

    -- 6. GERAÇÃO ATÓMICA DE NÚMERO DIÁRIO DE PEDIDO
    INSERT INTO public.restaurant_counters (restaurant_id, last_order_number, updated_at)
    VALUES (v_restaurant.id, 1, NOW())
    ON CONFLICT (restaurant_id)
    DO UPDATE SET
        last_order_number = public.restaurant_counters.last_order_number + 1,
        updated_at = NOW()
    RETURNING last_order_number INTO v_order_number;

    -- 7. GERAÇÃO DE TRACKING TOKEN CRIPTOGRÁFICO
    v_tracking_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

    -- 8. INSERÇÃO DO CABEÇALHO DO PEDIDO
    INSERT INTO public.orders (
        restaurant_id,
        table_id,
        table_number,
        order_number,
        tracking_token,
        status,
        subtotal,
        total,
        customer_notes
    ) VALUES (
        v_restaurant.id,
        v_table_id,
        p_table_number,
        v_order_number,
        v_tracking_token,
        'pending',
        v_subtotal,
        v_total,
        p_customer_notes
    ) RETURNING id, created_at, tracking_token INTO v_order_id, v_created_at, v_tracking_token;

    -- 9. INSERÇÃO DOS ITENS (ORDER_ITEMS) COM SNAPSHOTS IMUTÁVEIS
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        v_item_notes := v_item->>'notes';

        SELECT id, name, price, cost, unit_quantity
        INTO v_product
        FROM public.products
        WHERE id = v_product_id;

        IF v_product.unit_quantity IS NOT NULL AND trim(v_product.unit_quantity) IN ('Normal', 'Familiar', '20cl', '33cl') THEN
            v_final_product_name := v_product.name || ' (' || trim(v_product.unit_quantity) || ')';
        ELSE
            v_final_product_name := v_product.name;
        END IF;

        -- Extrair novamente modifier_ids para inserção e snapshots
        v_modifier_ids_json := v_item->'modifier_ids';
        v_modifier_uuids := ARRAY[]::UUID[];
        v_mods_price_delta := 0.00;
        v_selected_modifiers_snapshot := '[]'::jsonb;
        v_modifiers_summary_text := NULL;

        IF v_modifier_ids_json IS NOT NULL AND jsonb_typeof(v_modifier_ids_json) = 'array' AND jsonb_array_length(v_modifier_ids_json) > 0 THEN
            FOR v_modifier_uuid_elem IN SELECT jsonb_array_elements_text(v_modifier_ids_json)
            LOOP
                v_modifier_uuids := array_append(v_modifier_uuids, v_modifier_uuid_elem::UUID);
            END LOOP;

            -- Snapshot imutável dos modificadores e texto formatado para o KDS
            SELECT
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', pm.id,
                            'label', pm.label,
                            'group', pm."group",
                            'price_delta', pm.price_delta
                        ) ORDER BY pm.sort_order, pm.created_at
                    ),
                    '[]'::jsonb
                ),
                string_agg(pm.label, ', ' ORDER BY pm.sort_order, pm.created_at),
                COALESCE(sum(pm.price_delta), 0.00)
            INTO
                v_selected_modifiers_snapshot,
                v_modifiers_summary_text,
                v_mods_price_delta
            FROM public.product_modifiers pm
            WHERE pm.id = ANY(v_modifier_uuids)
              AND pm.product_id = v_product_id;
        END IF;

        v_item_unit_price := v_product.price + v_mods_price_delta;

        INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    line_total,
    notes,
    selected_modifiers,
    modifiers_summary
            ) VALUES (
                v_order_id,
                v_product.id,
                v_final_product_name,
                v_quantity,
                v_item_unit_price,
                v_product.cost,
                v_item_notes,
                v_selected_modifiers_snapshot,
                v_modifiers_summary_text
            ) RETURNING id INTO v_order_item_id;

            v_item_response := jsonb_build_object(
                'id', v_order_item_id,
                'product_id', v_product.id,
                'product_name', v_final_product_name,
                'quantity', v_quantity,
                'unit_price', v_item_unit_price,
                'notes', v_item_notes,
                'selected_modifiers', v_selected_modifiers_snapshot,
                'modifiers_summary', v_modifiers_summary_text
            );
            v_returned_items := v_returned_items || jsonb_build_array(v_item_response);
        END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order_id,
            'restaurant_id', v_restaurant.id,
            'restaurant_slug', v_restaurant.slug,
            'restaurant_name', v_restaurant.name,
            'table_id', v_table_id,
            'table_number', p_table_number,
            'table_name', v_table_name,
            'order_number', v_order_number,
            'status', 'pending',
            'subtotal', v_subtotal,
            'total', v_total,
            'customer_notes', p_customer_notes,
            'created_at', v_created_at,
            'tracking_token', v_tracking_token,
            'items', v_returned_items
        )
    );
END;
$$;

-- 5. PERMISSÕES DE EXECUÇÃO
REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, INTEGER, TEXT, JSONB) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.create_order_atomic(TEXT, INTEGER, TEXT, JSONB) IS
'GULAS: Criação atómica de encomendas com suporte a modificadores selecionados, validação Zero-Trust e persistência para KDS.';

COMMIT;
