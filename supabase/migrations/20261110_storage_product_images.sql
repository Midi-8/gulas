-- ============================================================================
-- GULAS RESTAURANT PLATFORM — STORAGE PRODUCT IMAGES MIGRATION
-- Migration: 20261110_storage_product_images.sql
-- ============================================================================

-- 1. Criação / Assegurar compatibilidade da view/tabela staff_users
-- No schema da aplicação os utilizadores de staff residem em public.profiles.
-- Esta view garante total conformidade e interoperabilidade com queries que consultem staff_users.
CREATE OR REPLACE VIEW public.staff_users AS
SELECT 
    id,
    restaurant_id,
    full_name,
    role,
    created_at,
    updated_at
FROM public.profiles
WHERE role IN ('owner', 'manager', 'staff');

-- 2. Criação idempotente do bucket público "product-images"
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB
    ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
    public = true;

-- 3. Políticas de RLS para storage.objects

-- Leitura pública para qualquer visitante / cliente ver as fotos dos pratos
DROP POLICY IF EXISTS "Public Read Product Images" ON storage.objects;
DROP POLICY IF EXISTS "public read" ON storage.objects;
CREATE POLICY "Public Read Product Images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Upload (INSERT) restrito a utilizadores autenticados que sejam staff
DROP POLICY IF EXISTS "Staff Upload Product Images" ON storage.objects;
DROP POLICY IF EXISTS "staff write" ON storage.objects;
CREATE POLICY "Staff Upload Product Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND (
        EXISTS (
            SELECT 1 FROM public.staff_users su
            WHERE su.id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
);

-- Atualização (UPDATE) restrita a staff autenticado
DROP POLICY IF EXISTS "Staff Update Product Images" ON storage.objects;
CREATE POLICY "Staff Update Product Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (
        EXISTS (
            SELECT 1 FROM public.staff_users su
            WHERE su.id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
);

-- Eliminação (DELETE) restrita a staff autenticado
DROP POLICY IF EXISTS "Staff Delete Product Images" ON storage.objects;
CREATE POLICY "Staff Delete Product Images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (
        EXISTS (
            SELECT 1 FROM public.staff_users su
            WHERE su.id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
);

