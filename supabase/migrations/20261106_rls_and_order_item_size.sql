-- ============================================================================
-- GULAS RESTAURANT PLATFORM — RLS DE ATUALIZAÇÃO DE RESTAURANTE E TAMANHO NOS ITENS
-- Migration: 20261106_rls_and_order_item_size.sql
-- Description:
--   1. Adiciona política RLS FOR UPDATE em public.restaurants para o staff poder
--      abrir/encerrar a receção de pedidos digitais (is_open).
--   2. Atualiza create_order_atomic para gravar o tamanho/formato (unit_quantity:
--      Normal, Familiar, 20cl, 33cl) diretamente em order_items.product_name.
-- ============================================================================

BEGIN;

-- 1. Política RLS para permitir ao staff autenticado atualizar o estado do seu restaurante
DROP POLICY IF EXISTS "Staff Update Restaurant" ON public.restaurants;
CREATE POLICY "Staff Update Restaurant"
ON public.restaurants FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
)
WITH CHECK (
    id IN (
        SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
);

-- 1.5. Garantir suporte a Mesas 1 a 20 na tabela public.tables
INSERT INTO public.tables (restaurant_id, number, name, is_active)
SELECT
    'b0000000-0000-4000-8000-000000000001'::uuid,
    gs.num,
    'Mesa ' || gs.num,
    true
FROM generate_series(1, 20) AS gs(num)
ON CONFLICT (restaurant_id, number) DO NOTHING;

-- 2. Atualizar create_order_atomic para incluir unit_quantity no product_name quando aplicável
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_restaurant_slug TEXT,
    p_table_number INTEGER,
    p_customer_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
BEGIN
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

    IF p_customer_notes IS NOT NULL AND length(trim(p_customer_notes)) > 1000 THEN
        RAISE EXCEPTION 'INVALID_NOTES: As observações gerais excedem o limite de 1000 caracteres.' USING ERRCODE = 'P0001';
    END IF;

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

        v_subtotal := v_subtotal + (v_product.price * v_quantity);
    END LOOP;

    v_total := v_subtotal;

    INSERT INTO public.restaurant_counters (restaurant_id, last_order_number, updated_at)
    VALUES (v_restaurant.id, 1, NOW())
    ON CONFLICT (restaurant_id)
    DO UPDATE SET
        last_order_number = public.restaurant_counters.last_order_number + 1,
        updated_at = NOW()
    RETURNING last_order_number INTO v_order_number;

    v_tracking_token := encode(gen_random_bytes(32), 'hex');

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

        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            unit_cost,
            notes
        ) VALUES (
            v_order_id,
            v_product.id,
            v_final_product_name,
            v_quantity,
            v_product.price,
            v_product.cost,
            v_item_notes
        ) RETURNING id INTO v_order_item_id;

        v_item_response := jsonb_build_object(
            'id', v_order_item_id,
            'product_id', v_product.id,
            'product_name', v_final_product_name,
            'quantity', v_quantity,
            'unit_price', v_product.price,
            'notes', v_item_notes
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

COMMIT;

