import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Utensils,
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  ChevronRight,
  ArrowRight,
  QrCode,
  Flame,
  ShieldCheck,
} from 'lucide-react';

export const metadata = {
  title: 'GULAS — Pizza, Burger & Coffee (Vila das Aves)',
  description:
    'Menu digital e pedidos em tempo real do Gulas em Vila das Aves: Caracóizzz, Burgers artesanais, Pizzas de longa fermentação, Panuozzos e Take-Away.',
};

const SIGNATURE_DISHES = [
  {
    title: 'Caracóizzz',
    category: 'Assinatura Gulas',
    priceFrom: '7,00 €',
    desc: 'Massa artesanal enrolada no forno com queijo fundido, bacon crocante e recheios generosos.',
    image: '/images/produtos/caracoizz-cheddar-e-bacon.webp',
    tag: 'Exclusivo',
  },
  {
    title: 'Gulas Burger',
    category: 'Burgers Artesanais',
    priceFrom: '8,50 €',
    desc: 'Carne bovina selecionada, cheddar derretido, bacon estaladiço e molho da casa em brioche tostado.',
    image: '/images/produtos/gulas-burger.webp',
    tag: 'Mais Pedido',
  },
  {
    title: 'Pizzas de Forno',
    category: 'Longa Fermentação',
    priceFrom: '8,50 €',
    desc: 'Base leve e crocante, tomate italiano San Marzano, mozzarella fresca e ingredientes selecionados.',
    image: '/images/produtos/pepe-do-bosque.webp',
    tag: 'Artesanal',
  },
  {
    title: 'Panuozzos',
    category: 'Sanduíche Napolitana',
    priceFrom: '8,50 €',
    desc: 'Pão de pizza assado na hora a alta temperatura, recheado com presunto ibérico, queijos e frescos.',
    image: '/images/produtos/panuozzo-iberico.webp',
    tag: 'Favorito',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col selection:bg-zinc-900 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/logo.jpg"
              alt="Gulas"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-contain bg-zinc-50 border border-zinc-200/80"
            />
            <div>
              <span className="font-bold text-base tracking-tight text-zinc-950 uppercase leading-none block">
                GULAS
              </span>
              <span className="text-[11px] font-medium text-zinc-500 leading-none mt-0.5 block">
                Pizza · Burger · Coffee
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <a
              href="tel:+351252870120"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
              <span>252 870 120</span>
            </a>
            <Link
              href="/menu/gulas"
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Abrir Menu Digital</span>
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Minimalist Structured Editorial Hero */}
      <section className="bg-white border-b border-zinc-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              {/* Location & Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-zinc-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Vila das Aves</span>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-900 font-semibold">Pedidos na Mesa &amp; Take-Away</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-950 leading-[1.1]">
                Cozinha artesanal de forno.{' '}
                <span className="text-zinc-500 font-normal">
                  Pedido direto no teu telemóvel.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-zinc-600 max-w-xl leading-relaxed">
                Pizzas de longa fermentação, burgers artesanais em pão brioche, os originais{' '}
                <strong className="text-zinc-900 font-semibold">Caracóizzz</strong> e panuozzos
                estaladiços. Faz o teu pedido na mesa ou para levar e acompanha a preparação em direto.
              </p>

              {/* Hero CTAs */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/menu/gulas"
                  className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Ver Menu &amp; Fazer Pedido</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://maps.google.com/?q=Gulas+Vila+das+Aves"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-zinc-500" />
                  <span>Como Chegar</span>
                </a>
              </div>
            </div>

            {/* Right Visual Showcase */}
            <div className="lg:col-span-5">
              <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/80 shadow-xs">
                <Image
                  src="/images/cover.jpg"
                  alt="Gulas Ambiente Gastronómico"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 45vw"
                />
              </div>
            </div>
          </div>

          {/* Info Metrics Strip */}
          <div className="mt-12 pt-8 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200/70 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                  Horário de Serviço
                </span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                  12h00–15h00 · 19h00–23h00
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200/70 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                  Take-Away Direto
                </span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                  Pizzas Familiares &amp; Balcão
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-zinc-200/70 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                  Tempo Real
                </span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                  Estado do pedido ao segundo
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Dishes Grid */}
      <section className="py-14 sm:py-18 max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
              Destaques da Cozinha
            </span>
            <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">
              Especialidades feitas de raiz
            </h2>
          </div>
          <Link
            href="/menu/gulas"
            className="text-xs sm:text-sm font-semibold text-zinc-600 hover:text-zinc-950 flex items-center gap-1 group transition-colors"
          >
            <span>Explorar menu completo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SIGNATURE_DISHES.map((dish) => (
            <Link
              key={dish.title}
              href="/menu/gulas"
              className="group rounded-2xl bg-white border border-zinc-200/80 overflow-hidden hover:border-zinc-300 transition-all duration-200 flex flex-col"
            >
              <div className="relative aspect-4/3 w-full bg-zinc-100 overflow-hidden border-b border-zinc-100">
                <Image
                  src={dish.image}
                  alt={dish.title}
                  fill
                  className="object-cover group-hover:scale-103 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
                <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-zinc-900 text-[10px] font-semibold border border-zinc-200/60">
                  {dish.tag}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                      {dish.category}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 tabular-nums">
                      desde {dish.priceFrom}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {dish.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {dish.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-700 group-hover:text-zinc-950 transition-colors">
                  <span>Ver no Menu</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Service Modes: Dine-in vs Take-away */}
      <section className="bg-white border-t border-zinc-200/80 py-14 sm:py-18">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
              Modalidades de Serviço
            </span>
            <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">
              Na sala ou para levar para casa
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dine In */}
            <Link
              href="/menu/gulas/table/4"
              className="group p-6 rounded-2xl bg-[#FAFAFA] border border-zinc-200/80 hover:border-zinc-400 hover:bg-white transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center mb-4">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-950">
                  Pedido na Mesa
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 leading-relaxed">
                  Estás sentado no restaurante? Abre o menu com a tua mesa selecionada, adiciona os pratos ou pede a conta diretamente pelo telemóvel.
                </p>
              </div>
              <div className="mt-6 pt-3.5 border-t border-zinc-200/70 flex items-center justify-between text-xs font-semibold text-zinc-900">
                <span>Abrir Menu na Mesa</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Take Away */}
            <Link
              href="/menu/gulas"
              className="group p-6 rounded-2xl bg-[#FAFAFA] border border-zinc-200/80 hover:border-zinc-400 hover:bg-white transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 text-zinc-900 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-950">
                  Take-Away &amp; Pizzas Familiares
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 leading-relaxed">
                  Seleciona a opção Take-Away no carrinho, escolhe o tamanho Normal ou Familiar, indica o teu nome e acompanha quando estiver pronto a levantar.
                </p>
              </div>
              <div className="mt-6 pt-3.5 border-t border-zinc-200/70 flex items-center justify-between text-xs font-semibold text-zinc-900">
                <span>Encomendar para Take-Away</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-zinc-500 mt-auto border-t border-zinc-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-zinc-900 tracking-tight">GULAS</span>
            <span className="text-zinc-300">·</span>
            <span>Pizza, Burger &amp; Coffee</span>
            <span className="text-zinc-300">·</span>
            <span>Vila das Aves</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="tel:+351252870120"
              className="hover:text-zinc-900 transition-colors font-medium"
            >
              +351 252 870 120
            </a>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 transition-colors font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Área Staff / KDS</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
