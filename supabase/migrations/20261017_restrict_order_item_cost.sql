-- ============================================================================
-- GULAS: restricao do custo unitario dos itens de pedido
-- Data: 2026-10-17
--
-- Este ficheiro:
-- 1. Retira a leitura direta de order_items aos clientes.
-- 2. Repoe apenas as colunas necessarias para a experiencia publica.
-- 3. Valida que unit_cost deixou de estar acessivel.
--
-- Nao elimina dados e nao altera politicas RLS.
-- ============================================================================


BEGIN;


REVOKE SELECT ON TABLE public.order_items
FROM PUBLIC, anon, authenticated;


GRANT SELECT (
    id,
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    notes,
    created_at
)
ON TABLE public.order_items
TO anon, authenticated;


DO $$
BEGIN
    IF pg_catalog.has_column_privilege(
        'anon',
        'public.order_items',
        'unit_cost',
        'SELECT'
    ) OR pg_catalog.has_column_privilege(
        'authenticated',
        'public.order_items',
        'unit_cost',
        'SELECT'
    ) THEN
        RAISE EXCEPTION
            'Validacao falhou: unit_cost continua acessivel aos clientes.';
    END IF;
END;
$$;


COMMIT;