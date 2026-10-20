import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const menu = JSON.parse(readFileSync(join(root, 'src/data/gulas-menu.json'), 'utf8'));

const RID = 'e1a1a1a1-1111-4111-a111-111111111111';

const CAT_N = {
  'menu-as-12-na-tojela': 11,
  novidades: 4,
  cocktails: 12,
  sangrias: 13,
  entradas: 1,
  caracoizz: 2,
  panuozzos: 3,
  'pizzas-classicas': 7,
  'pizzas-especiais': 8,
  'ingredientes-extra-pizza': 14,
  burgers: 5,
  'ingredientes-extra-burger': 15,
  pregos: 6,
  wraps: 16,
  cervejas: 17,
  vinhos: 18,
  bebidas: 10,
  coffee: 19,
  sobremesas: 9,
  digestivos: 20,
  'taxas-extra': 21,
};

const TAGS = {
  'promoção': 'promocao',
  novidade: 'novidade',
  picante: 'picante',
  vegetariano: 'vegetariano',
  vegan: 'vegan',
  extra: 'extra',
  acompanhamento: 'acompanhamento',
};

function uuidCat(n) {
  const nn = String(n).padStart(2, '0');
  return `c1111111-00${nn}-4000-8000-${String(n).padStart(12, '0')}`;
}

function uuidProd(n) {
  const n4 = String(n).padStart(4, '0');
  return `b1111111-${n4}-4000-8000-${String(n).padStart(12, '0')}`;
}

function slugify(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlArr(items) {
  if (!items.length) return "'{}'";
  return `ARRAY[${items.map(sqlStr).join(', ')}]`;
}

const usedSlugs = new Set();
const categories = [];
const products = [];
let pSeq = 0;

for (const [index, cat] of menu.categorias.entries()) {
  const n = CAT_N[cat.slug];
  if (!n) throw new Error(`slug sem id: ${cat.slug}`);
  const id = uuidCat(n);
  categories.push({
    id,
    name: cat.nome,
    slug: cat.slug,
    description: cat.notas_categoria || '',
    position: index + 1,
    isSpecialty: cat.slug === 'caracoizz',
  });
  if (cat.notas_categoria && cat.notas_categoria.length > 255) {
    throw new Error(`subtitle longa: ${cat.slug}`);
  }

  let pos = 0;
  for (const item of cat.itens) {
    const badges = (item.tags || []).map((t) => {
      const mapped = TAGS[t];
      if (!mapped) throw new Error(`tag desconhecida: ${t}`);
      return mapped;
    });
    const restrictions = (item.restricoes || []).join(' · ');
    if (restrictions.length > 255) throw new Error(`restricao longa: ${item.nome}`);
    const origin = item.origem || '';
    const description = item.descricao || '';

    let variants;
    if (item.variantes_preco) {
      variants = item.variantes_preco.map((v) => ({ price: v.preco, unit: v.tamanho }));
    } else if (item.preco_min != null) {
      variants = [
        { price: item.preco_min, unit: 'Normal' },
        { price: item.preco_max, unit: 'Familiar' },
      ];
    } else {
      variants = [{ price: item.preco, unit: '' }];
    }

    for (const variant of variants) {
      pos += 1;
      pSeq += 1;
      let slug = slugify(`${item.nome}${variant.unit ? ` ${variant.unit}` : ''}`);
      if (!slug) slug = `item-${pSeq}`;
      if (usedSlugs.has(slug)) slug = `${slug}-${cat.slug}`.slice(0, 100);
      if (usedSlugs.has(slug)) slug = `${slug}-${pSeq}`.slice(0, 100);
      usedSlugs.add(slug);
      if (variant.unit.length > 50) throw new Error(`unit longa: ${item.nome}`);
      products.push({
        id: uuidProd(pSeq),
        categoryId: id,
        categorySlug: cat.slug,
        name: item.nome,
        slug,
        description,
        price: variant.price,
        position: pos,
        badges,
        unit: variant.unit,
        origin,
        restrictions,
      });
    }
  }
}

const avisos = menu.avisos_globais;

function emitCatalog() {
  const catLines = categories
    .map((c) => {
      const desc = c.description ? `\n    description: ${JSON.stringify(c.description)},` : '';
      const spec = c.isSpecialty ? '\n    isSpecialty: true,' : '';
      return `  {
    id: ${JSON.stringify(c.id)},
    restaurantId: RESTAURANT_ID,
    name: ${JSON.stringify(c.name)},
    slug: ${JSON.stringify(c.slug)},${desc}
    position: ${c.position},
    active: true,${spec}
  }`;
    })
    .join(',\n');

  const prodLines = products
    .map((p) => {
      const extra = [];
      if (p.badges.length) extra.push(`badges: ${JSON.stringify(p.badges)} as Product['badges']`);
      if (p.unit) extra.push(`unitQuantity: ${JSON.stringify(p.unit)}`);
      if (p.origin) extra.push(`includesNotes: ${JSON.stringify(p.origin)}`);
      if (p.restrictions) extra.push(`customizationNote: ${JSON.stringify(p.restrictions)}`);
      const tail = extra.length ? `,\n    ${extra.join(',\n    ')}` : '';
      return `  {
    id: ${JSON.stringify(p.id)},
    restaurantId: RESTAURANT_ID,
    categoryId: ${JSON.stringify(p.categoryId)},
    name: ${JSON.stringify(p.name)},
    description: ${JSON.stringify(p.description)},
    price: ${p.price.toFixed(2)},
    imageUrl: '',
    available: true,
    position: ${p.position}${tail}
  }`;
    })
    .join(',\n');

  return `import { Category, Product } from '@/types/restaurant';

export const RESTAURANT_ID = '${RID}';

export const menuSource = ${JSON.stringify(menu.fonte)};

export const menuAvisos: string[] = ${JSON.stringify(avisos, null, 2)};

export const menuCategories: Category[] = [
${catLines}
];

export const menuProducts: Product[] = [
${prodLines}
];
`;
}

function productValues() {
  return products
    .map((p) => {
      return `(${[
        sqlStr(p.id),
        sqlStr(RID),
        sqlStr(p.categoryId),
        sqlStr(p.name),
        sqlStr(p.slug),
        sqlStr(p.description),
        p.price.toFixed(2),
        'NULL',
        'NULL',
        'true',
        p.position,
        sqlArr(p.badges),
        p.unit ? sqlStr(p.unit) : 'NULL',
        p.origin ? sqlStr(p.origin) : 'NULL',
        p.restrictions ? sqlStr(p.restrictions) : 'NULL',
        "'{}'",
        'NULL',
      ].join(', ')})`;
    })
    .join(',\n');
}

function categoryValues() {
  return categories
    .map((c) => {
      return `(${[
        sqlStr(c.id),
        sqlStr(RID),
        sqlStr(c.name),
        sqlStr(c.slug),
        c.description ? sqlStr(c.description) : 'NULL',
        'NULL',
        c.position,
        'true',
        c.isSpecialty ? 'true' : 'false',
      ].join(', ')})`;
    })
    .join(',\n');
}

const slugList = categories.map((c) => sqlStr(c.slug)).join(', ');
const desc = avisos.join(' ');

const catalogSql = `-- 2. CATEGORIAS DO MENU REAL
DELETE FROM public.products WHERE restaurant_id = '${RID}';
DELETE FROM public.categories
WHERE restaurant_id = '${RID}'
  AND slug NOT IN (${slugList});

INSERT INTO public.categories (id, restaurant_id, name, slug, description, subtitle, display_order, is_active, is_specialty)
VALUES
${categoryValues()}
ON CONFLICT (restaurant_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    subtitle = EXCLUDED.subtitle,
    display_order = EXCLUDED.display_order,
    is_active = true,
    is_specialty = EXCLUDED.is_specialty;

-- 3. PRODUTOS DO MENU REAL
INSERT INTO public.products (
    id, restaurant_id, category_id, name, slug, description, price, cost, image_url,
    is_available, display_order, badges, unit_quantity, includes_notes, customization_note,
    allergens, prep_time_minutes
) VALUES
${productValues()}
ON CONFLICT (restaurant_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    category_id = EXCLUDED.category_id,
    image_url = EXCLUDED.image_url,
    is_available = EXCLUDED.is_available,
    display_order = EXCLUDED.display_order,
    badges = EXCLUDED.badges,
    unit_quantity = EXCLUDED.unit_quantity,
    includes_notes = EXCLUDED.includes_notes,
    customization_note = EXCLUDED.customization_note,
    allergens = EXCLUDED.allergens;
`;

const seed = `-- ============================================================================
-- GULAS RESTAURANT PLATFORM — SEED DATA
-- Fonte do menu: ${menu.fonte}
-- ============================================================================

INSERT INTO public.restaurants (
    id, name, full_name, slug, tagline, description, location, cover_image_url,
    currency, timezone, address, phone, is_active, is_open, opening_hours
) VALUES (
    '${RID}',
    'Gulas',
    ${sqlStr(menu.restaurante)},
    'gulas',
    'Pizza • Burger • Coffee',
    ${sqlStr(desc)},
    'Vila das Aves, Portugal',
    '/images/cover.jpg',
    'EUR',
    'Europe/Lisbon',
    'Vila das Aves, Portugal',
    '+351 252 870 120',
    true,
    true,
    '12:00 – 15:00 • 19:00 – 23:00'
) ON CONFLICT (slug) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description;

${catalogSql}
-- 4. MESAS
INSERT INTO public.tables (id, restaurant_id, number, name, qr_token, is_active)
VALUES
    ('f1111111-0001-4000-8000-000000000001', '${RID}', 1, 'Mesa 1 (Esplanada)', 'qr_gulas_tbl_1', true),
    ('f1111111-0002-4000-8000-000000000002', '${RID}', 2, 'Mesa 2 (Esplanada)', 'qr_gulas_tbl_2', true),
    ('f1111111-0003-4000-8000-000000000003', '${RID}', 3, 'Mesa 3 (Interior)', 'qr_gulas_tbl_3', true),
    ('f1111111-0004-4000-8000-000000000004', '${RID}', 4, 'Mesa 4 (Sala Principal)', 'qr_gulas_tbl_4', true),
    ('f1111111-0005-4000-8000-000000000005', '${RID}', 5, 'Mesa 5 (Sala Principal)', 'qr_gulas_tbl_5', true),
    ('f1111111-0006-4000-8000-000000000006', '${RID}', 6, 'Mesa 6 (Balcão / Janela)', 'qr_gulas_tbl_6', true),
    ('f1111111-0007-4000-8000-000000000007', '${RID}', 7, 'Mesa 7 (Sala Principal)', 'qr_gulas_tbl_7', true),
    ('f1111111-0008-4000-8000-000000000008', '${RID}', 8, 'Mesa 8 (Central)', 'qr_gulas_tbl_8', true),
    ('f1111111-0009-4000-8000-000000000009', '${RID}', 9, 'Mesa 9 (Grupo)', 'qr_gulas_tbl_9', true),
    ('f1111111-0010-4000-8000-000000000010', '${RID}', 10, 'Mesa 10 (Reservado)', 'qr_gulas_tbl_10', true)
ON CONFLICT (restaurant_id, number) DO NOTHING;
`;

const migration = `-- Menu real Gulas (${menu.fonte})
BEGIN;

UPDATE public.restaurants
SET full_name = ${sqlStr(menu.restaurante)},
    tagline = 'Pizza • Burger • Coffee',
    description = ${sqlStr(desc)}
WHERE id = '${RID}';

${catalogSql}
COMMIT;
`;

writeFileSync(join(root, 'src/data/gulasCatalog.ts'), emitCatalog());
writeFileSync(join(root, 'supabase/seed.sql'), seed);
writeFileSync(join(root, 'supabase/migrations/20261020_gulas_menu.sql'), migration);

console.log(`categorias ${categories.length} produtos ${products.length}`);
