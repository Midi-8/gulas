-- ============================================================================
-- GULAS RESTAURANT PLATFORM — CORREÇÃO DO TOKEN DE RASTREIO ATÓMICO
-- Migration: 20261105_return_tracking_token_in_create_order_atomic.sql
-- Description: Garante a existência da coluna tracking_token e atualiza a função
--              create_order_atomic para capturar e retornar tracking_token
-- ============================================================================

BEGIN;

-- 1. Assegurar coluna tracking_token na tabela public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64) DEFAULT encode(gen_random_bytes(32), 'hex');

-- 2. Atualizar função transacional create_order_atomic
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
    -- Variáveis do Restaurante
    v_restaurant RECORD;
    -- Variáveis da Mesa
    v_table RECORD;
    -- Variáveis de Processamento de Pedido
    v_order_id UUID;
    v_order_number INTEGER;
    v_created_at TIMESTAMPTZ;
    v_tracking_token VARCHAR(64);
    v_subtotal NUMERIC(10,2) := 0.00;
    v_total NUMERIC(10,2) := 0.00;
    -- Iteração de Itens
    v_item JSONB;
    v_product_id_text TEXT;
    v_product_id UUID;
    v_quantity INTEGER;
    v_item_notes TEXT;
    v_product RECORD;
    v_order_item_id UUID;
    -- Arrays para retorno estruturado
    v_returned_items JSONB := '[]'::jsonb;
    v_item_response JSONB;
    -- Tabela temporária / array em memória de validação de itens
    v_items_count INTEGER;
BEGIN
    -- ------------------------------------------------------------------------
    -- 1. VALIDAÇÃO DO RESTAURANTE (Zero-Trust)
    -- ------------------------------------------------------------------------
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

    -- ------------------------------------------------------------------------
    -- 2. VALIDAÇÃO DA MESA
    -- ------------------------------------------------------------------------
    IF p_table_number IS NULL OR p_table_number <= 0 THEN
        RAISE EXCEPTION 'TABLE_INVALID: Número da mesa inválido.' USING ERRCODE = 'P0001';
    END IF;

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

    -- ------------------------------------------------------------------------
    -- 3. VALIDAÇÃO DE OBSERVAÇÕES GERAIS
    -- ------------------------------------------------------------------------
    IF p_customer_notes IS NOT NULL AND length(trim(p_customer_notes)) > 1000 THEN
        RAISE EXCEPTION 'INVALID_NOTES: As observações gerais excedem o limite de 1000 caracteres.' USING ERRCODE = 'P0001';
    END IF;

    -- ------------------------------------------------------------------------
    -- 4. VALIDAÇÃO DO CARRINHO (Estrutura e Limites)
    -- ------------------------------------------------------------------------
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'EMPTY_CART: Formato de artigos inválido.' USING ERRCODE = 'P0001';
    END IF;

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: O carrinho está vazio.' USING ERRCODE = 'P0001';
    END IF;

    IF v_items_count > 50 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY: O pedido não pode conter mais de 50 artigos distintos.' USING ERRCODE = 'P0001';
    END IF;

    -- ------------------------------------------------------------------------
    -- 5. CRIAÇÃO DE TABELA TEMPORÁRIA PARA ISOLAMENTO E CÁLCULO SEGURO
    -- ------------------------------------------------------------------------
    CREATE TEMPORARY TABLE IF NOT EXISTS _order_staging_items (
        product_id UUID NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10,2) NOT NULL,
        unit_cost NUMERIC(10,2),
        notes TEXT
    ) ON COMMIT DROP;

    TRUNCATE TABLE _order_staging_items;

    -- ------------------------------------------------------------------------
    -- 6. VALIDAÇÃO DOS ITENS E OBTENÇÃO DE PREÇOS REAIS DA BD
    -- ------------------------------------------------------------------------
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id_text := v_item->>'product_id';
        
        -- Validar formato UUID
        IF v_product_id_text IS NULL OR v_product_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RAISE EXCEPTION 'PRODUCT_INVALID: Formato de identificador de produto inválido.' USING ERRCODE = 'P0001';
        END IF;

        v_product_id := v_product_id_text::UUID;

        -- Validar quantidade (1 a 50)
        BEGIN
            v_quantity := (v_item->>'quantity')::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantidade deve ser um número inteiro válido.' USING ERRCODE = 'P0001';
        END;

        IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 50 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: A quantidade por artigo deve estar entre 1 e 50.' USING ERRCODE = 'P0001';
        END IF;

        -- Validar notas do item (máx 500 caracteres)
        v_item_notes := nullif(trim(v_item->>'notes'), '');
        IF v_item_notes IS NOT NULL AND length(v_item_notes) > 500 THEN
            RAISE EXCEPTION 'INVALID_NOTES: A observação do artigo excede o limite de 500 caracteres.' USING ERRCODE = 'P0001';
        END IF;

        -- Procurar produto ativo e categoria ativa no restaurante correto
        SELECT 
            p.id,
            p.name,
            p.price,
            p.cost,
            p.is_available,
            c.is_active AS category_is_active
        INTO v_product
        FROM public.products p
        JOIN public.categories c ON c.id = p.category_id
        WHERE p.id = v_product_id
          AND p.restaurant_id = v_restaurant.id
          AND c.restaurant_id = v_restaurant.id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_INVALID: O artigo selecionado não existe ou não pertence ao restaurante %.', v_restaurant.name USING ERRCODE = 'P0001';
        END IF;

        IF NOT v_product.is_available THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: O artigo "%" encontra-se esgotado / indisponível.', v_product.name USING ERRCODE = 'P0001';
        END IF;

        IF NOT v_product.category_is_active THEN
            RAISE EXCEPTION 'PRODUCT_UNAVAILABLE: A categoria do artigo "%" encontra-se desativada de momento.', v_product.name USING ERRCODE = 'P0001';
        END IF;

        -- Somatório com precisão NUMERIC da BD
        v_subtotal := v_subtotal + (v_product.price * v_quantity);

        -- Guardar item validado no staging
        INSERT INTO _order_staging_items (
            product_id,
            product_name,
            quantity,
            unit_price,
            unit_cost,
            notes
        ) VALUES (
            v_product.id,
            v_product.name,
            v_quantity,
            v_product.price,
            v_product.cost,
            v_item_notes
        );
    END LOOP;

    -- No M3: total = subtotal
    v_total := v_subtotal;

    -- ------------------------------------------------------------------------
    -- 7. GERAÇÃO DO ORDER NUMBER ATÓMICO
    -- ------------------------------------------------------------------------
    v_order_number := public.get_next_order_number(v_restaurant.id);

    -- ------------------------------------------------------------------------
    -- 8. INSERÇÃO DO PEDIDO (ORDERS) COM RETORNO DE TRACKING_TOKEN
    -- ------------------------------------------------------------------------
    INSERT INTO public.orders (
        restaurant_id,
        table_id,
        table_number,
        order_number,
        status,
        subtotal,
        total,
        customer_notes
    ) VALUES (
        v_restaurant.id,
        v_table.id,
        v_table.number,
        v_order_number,
        'pending',
        v_subtotal,
        v_total,
        nullif(trim(p_customer_notes), '')
    )
    RETURNING id, created_at, tracking_token INTO v_order_id, v_created_at, v_tracking_token;

    -- ------------------------------------------------------------------------
    -- 9. INSERÇÃO DOS ITENS (ORDER_ITEMS) COM SNAPSHOT HISTÓRICO
    -- ------------------------------------------------------------------------
    FOR v_product IN 
        SELECT product_id, product_name, quantity, unit_price, unit_cost, notes 
        FROM _order_staging_items
    LOOP
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
            v_product.product_id,
            v_product.product_name,
            v_product.quantity,
            v_product.unit_price,
            v_product.unit_cost,
            v_product.notes
        )
        RETURNING id INTO v_order_item_id;

        -- Construir item para resposta JSON
        v_item_response := jsonb_build_object(
            'id', v_order_item_id,
            'product_id', v_product.product_id,
            'product_name', v_product.product_name,
            'quantity', v_product.quantity,
            'unit_price', v_product.unit_price,
            'notes', v_product.notes
        );

        v_returned_items := v_returned_items || jsonb_build_array(v_item_response);
    END LOOP;

    -- ------------------------------------------------------------------------
    -- 10. RETORNO ESTRUTURADO PARA O FRONTEND / CAMADA NEXT.JS
    -- ------------------------------------------------------------------------
    RETURN jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order_id,
            'restaurant_id', v_restaurant.id,
            'restaurant_slug', v_restaurant.slug,
            'restaurant_name', v_restaurant.name,
            'table_id', v_table.id,
            'table_number', v_table.number,
            'table_name', v_table.name,
            'order_number', v_order_number,
            'status', 'pending',
            'subtotal', v_subtotal,
            'total', v_total,
            'customer_notes', nullif(trim(p_customer_notes), ''),
            'created_at', v_created_at,
            'tracking_token', v_tracking_token,
            'items', v_returned_items
        )
    );
END;
$$;

-- Permissões de execução
REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, INTEGER, TEXT, JSONB) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.create_order_atomic IS 'Criação transacional e atómica de pedidos no Gulas com validação server-side de preços, restaurante, mesa, produtos e retorno do tracking_token.';

COMMIT;

