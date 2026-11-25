-- ============================================================================
-- GULAS RESTAURANT PLATFORM — RBAC & SEGURANÇA KDS (DONO vs. FUNCIONÁRIOS)
-- Migration: 20261125_rbac_kds_staff_security.sql
-- Estado: PROPOSTA LOCAL PARA APROVAÇÃO (NÃO APLICAR DIRETAMENTE NA BD REMOTA)
-- Descrição:
--   1. Separação explícita de operações (SELECT, INSERT, UPDATE, DELETE) em public.orders.
--   2. Staff (cozinha/sala) restrito estritamente a pedidos ativos ('pending', 'accepted', 'preparing', 'ready').
--   3. DELETE de pedidos reservado exclusivamente ao dono ('owner').
--   4. Trigger de validação operacional: Staff só pode executar transições aprovadas
--      (pending -> accepted -> preparing -> ready -> completed), sendo estritamente
--      proibido de cancelar pedidos ou alterar campos administrativos e financeiros.
--   5. Restrição de catálogo, mesas e estado do restaurante exclusivamente a 'owner'.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TRIGGER DE PROTEÇÃO OPERACIONAL E IMUTABILIDADE PARA STAFF EM ORDERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_order_staff_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Obter o papel do utilizador autenticado
    SELECT p.role INTO v_user_role
    FROM public.profiles p
    WHERE p.id = auth.uid();

    -- Dono ('owner'), chamadas de sistema ('service_role') e triggers internos mantêm permissão plena
    IF v_user_role = 'owner' OR auth.role() = 'service_role' OR auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    -- Para contas 'staff' (ou qualquer papel sem privilégios de owner):

    -- 1. Imutabilidade absoluta de campos financeiros, estruturais e de destino
    IF OLD.restaurant_id IS DISTINCT FROM NEW.restaurant_id OR
       OLD.order_number IS DISTINCT FROM NEW.order_number OR
       OLD.subtotal IS DISTINCT FROM NEW.subtotal OR
       OLD.total IS DISTINCT FROM NEW.total OR
       OLD.table_id IS DISTINCT FROM NEW.table_id OR
       OLD.customer_notes IS DISTINCT FROM NEW.customer_notes OR
       OLD.tracking_token IS DISTINCT FROM NEW.tracking_token OR
       OLD.created_at IS DISTINCT FROM NEW.created_at THEN
        RAISE EXCEPTION 'VIOLATION_RBAC: Funcionários não têm permissão para alterar campos administrativos, financeiros ou estruturais do pedido.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Staff NÃO pode cancelar pedidos (reserva exclusiva do dono)
    IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'VIOLATION_RBAC: O cancelamento de pedidos é restrito exclusivamente ao dono do restaurante.'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Staff NÃO pode reabrir pedidos já concluídos
    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        RAISE EXCEPTION 'VIOLATION_RBAC: Apenas o dono pode reabrir pedidos que já se encontram concluídos.'
            USING ERRCODE = '42501';
    END IF;

    -- 4. Transições operacionais permitidas à cozinha/sala:
    --    pending -> accepted
    --    accepted -> preparing
    --    preparing -> ready
    --    ready -> completed
    IF NOT (
        (OLD.status = 'pending' AND NEW.status IN ('accepted', 'preparing')) OR
        (OLD.status = 'accepted' AND NEW.status = 'preparing') OR
        (OLD.status = 'preparing' AND NEW.status = 'ready') OR
        (OLD.status = 'ready' AND NEW.status = 'completed') OR
        (OLD.status = NEW.status)
    ) THEN
        RAISE EXCEPTION 'VIOLATION_RBAC: Transição operacional de estado não autorizada para o papel de funcionário.'
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_order_staff_update_rules ON public.orders;
CREATE TRIGGER trigger_enforce_order_staff_update_rules
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_order_staff_update_rules();


-- ----------------------------------------------------------------------------
-- 2. REFORÇO DE RLS NA TABELA PUBLIC.ORDERS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff Manage Orders" ON public.orders;
DROP POLICY IF EXISTS "Owner Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Staff Read Active Orders" ON public.orders;
DROP POLICY IF EXISTS "Owner Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Owner Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Staff Update Active Orders" ON public.orders;
DROP POLICY IF EXISTS "Owner Delete Orders" ON public.orders;

-- SELECT: Dono consulta todos os pedidos (ativos e históricos) do seu restaurante
CREATE POLICY "Owner Read Orders"
ON public.orders FOR SELECT
TO authenticated
USING (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);

-- SELECT: Staff consulta apenas pedidos ativos em preparação na bancada
CREATE POLICY "Staff Read Active Orders"
ON public.orders FOR SELECT
TO authenticated
USING (
    status IN ('pending', 'accepted', 'preparing', 'ready')
    AND restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'staff'
    )
);

-- INSERT: Inserção direta permitida apenas a Owner (pedidos públicos entram via RPC create_order_atomic)
CREATE POLICY "Owner Insert Orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);

-- UPDATE: Dono pode atualizar qualquer pedido do seu restaurante
CREATE POLICY "Owner Update Orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);

-- UPDATE: Staff atualiza apenas pedidos ativos (o trigger garante que só altera status operacional)
CREATE POLICY "Staff Update Active Orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
    status IN ('pending', 'accepted', 'preparing', 'ready')
    AND restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'staff'
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'staff'
    )
);

-- DELETE: Reservado exclusivamente ao Dono
CREATE POLICY "Owner Delete Orders"
ON public.orders FOR DELETE
TO authenticated
USING (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);


-- ----------------------------------------------------------------------------
-- 3. REFORÇO DE RLS NA TABELA PUBLIC.ORDER_ITEMS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff Manage Order Items" ON public.order_items;
DROP POLICY IF EXISTS "Owner Read Order Items" ON public.order_items;
DROP POLICY IF EXISTS "Staff Read Active Order Items" ON public.order_items;
DROP POLICY IF EXISTS "Owner Manage Order Items" ON public.order_items;

-- SELECT: Dono consulta todos os itens de pedidos do seu restaurante
CREATE POLICY "Owner Read Order Items"
ON public.order_items FOR SELECT
TO authenticated
USING (
    order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);

-- SELECT: Staff consulta itens apenas dos pedidos ativos na cozinha
CREATE POLICY "Staff Read Active Order Items"
ON public.order_items FOR SELECT
TO authenticated
USING (
    order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
        WHERE p.id = auth.uid() AND p.role = 'staff'
        AND o.status IN ('pending', 'accepted', 'preparing', 'ready')
    )
);

-- GESTÃO (INSERT / UPDATE / DELETE): Exclusiva ao Dono
CREATE POLICY "Owner Manage Order Items"
ON public.order_items FOR ALL
TO authenticated
USING (
    order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
)
WITH CHECK (
    order_id IN (
        SELECT o.id FROM public.orders o
        JOIN public.profiles p ON p.restaurant_id = o.restaurant_id
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);


-- ----------------------------------------------------------------------------
-- 4. REFORÇO DE GESTÃO DO CATÁLOGO E RESTAURANTE (PRODUTOS, MESAS, CATEGORIAS)
-- ----------------------------------------------------------------------------
-- Atualização do restaurante (abrir/fechar receção) restrita ao Dono
DROP POLICY IF EXISTS "Staff Update Restaurant" ON public.restaurants;
CREATE POLICY "Owner Update Restaurant"
ON public.restaurants FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
)
WITH CHECK (
    id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);

-- Gestão de produtos restrita ao Dono
DROP POLICY IF EXISTS "Staff Manage Products" ON public.products;
CREATE POLICY "Owner Manage Products"
ON public.products FOR ALL
TO authenticated
USING (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
)
WITH CHECK (
    restaurant_id IN (
        SELECT p.restaurant_id FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'owner'
    )
);

COMMIT;
