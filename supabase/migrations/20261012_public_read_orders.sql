-- ============================================================================
-- Migração: Permitir Leitura Pública de Pedidos para Live Order Tracking
-- Permite que clientes consultem o estado do seu pedido e subscrevam eventos
-- Realtime através da tabela public.orders e public.order_items
-- ============================================================================

-- Ativa políticas de SELECT para anon e authenticated em orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'orders'
        AND policyname = 'Public Read Orders'
    ) THEN
        CREATE POLICY "Public Read Orders"
        ON public.orders FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'order_items'
        AND policyname = 'Public Read Order Items'
    ) THEN
        CREATE POLICY "Public Read Order Items"
        ON public.order_items FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
END $$;
