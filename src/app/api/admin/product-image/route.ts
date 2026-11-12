import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff } from '@/lib/auth/staff';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Validação de autenticação de staff no servidor
    const staff = await getAuthenticatedStaff();
    if (!staff) {
      return NextResponse.json(
        { ok: false, error: 'Sessão expirada ou acesso não autorizado.' },
        { status: 401 }
      );
    }

    // 2. Extração dos dados multipart
    const formData = await request.formData();
    const file = formData.get('file');
    const productId = formData.get('productId');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: 'Ficheiro de imagem ausente ou inválido.' },
        { status: 400 }
      );
    }

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Identificador do produto em falta.' },
        { status: 400 }
      );
    }

    // Validação de tamanho no servidor
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: 'O ficheiro excede o limite máximo permitido de 5MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validação de cabeçalho do ficheiro (RIFF...WEBP) para não confiar só no browser
    // Bytes 0-3: 'RIFF' (0x52 0x49 0x46 0x46), Bytes 8-11: 'WEBP' (0x57 0x45 0x42 0x50)
    const isRiff =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const isWebp =
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isRiff || !isWebp) {
      // Caso não seja estritamente WEBP pelo cabeçalho mas seja imagem
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { ok: false, error: 'O formato do ficheiro deve ser uma imagem WebP válida.' },
          { status: 400 }
        );
      }
    }

    // 3. Validação de posse do produto pelo restaurante do staff
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'Serviço de base de dados indisponível.' },
        { status: 500 }
      );
    }

    const { data: product, error: fetchProductError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (fetchProductError || !product) {
      return NextResponse.json(
        { ok: false, error: 'Artigo não encontrado ou não autorizado.' },
        { status: 404 }
      );
    }

    // 4. Formatação do caminho no bucket: products/{productId}/{uuid}.webp
    const fileUuid = crypto.randomUUID();
    const storagePath = `products/${productId}/${fileUuid}.webp`;

    // 5. Upload para o bucket "product-images"
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      console.error('[API product-image] Erro de upload no Supabase Storage:', uploadError.message);
      return NextResponse.json(
        { ok: false, error: 'Falha ao gravar a imagem no armazenamento.' },
        { status: 500 }
      );
    }

    // 6. Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      ok: true,
      url: publicUrlData.publicUrl,
      path: storagePath,
    });
  } catch (err: unknown) {
    console.error('[API product-image] Erro inesperado:', err);
    return NextResponse.json(
      { ok: false, error: 'Ocorreu um erro interno ao processar o upload.' },
      { status: 500 }
    );
  }
}

