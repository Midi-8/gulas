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
  Sparkles,
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col selection:bg-orange-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/images/logo.jpg"
              alt="Gulas"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-contain bg-zinc-100 border border-zinc-200 shadow-2xs"
            />
            <div>
              <span className="font-black text-lg tracking-tight text-zinc-950 uppercase leading-none block">
                GULAS
              </span>
              <span className="text-[11px] font-semibold text-zinc-500 leading-none">
                Pizza · Burger · Coffee
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <a
              href="tel:+351252870120"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-orange-600" />
              <span>252 870 120</span>
            </a>
            <Link
              href="/menu/gulas"
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Abrir Menu Digital</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Modern Dark Editorial Hero */}
      <section className="relative overflow-hidden bg-zinc-950 text-white border-b border-zinc-800">
        {/* Background Cover with Subtle Dark Gradient */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <Image
            src="/images/cover.jpg"
            alt="Gulas Ambiente Gastronómico"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/90 via-zinc-950/75 to-zinc-950" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-24 sm:pb-24 flex flex-col items-center text-center">
          {/* Location & Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-xs font-semibold mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Vila das Aves</span>
            <span className="text-zinc-600">•</span>
            <span className="text-orange-400 font-bold">Pedidos na Mesa &amp; Take-Away</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white max-w-3xl leading-[1.08]">
            Artesanal no forno.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              Imediato no teu telemóvel.
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-base text-zinc-300 max-w-xl font-normal leading-relaxed">
            Pizzas de longa fermentação, burgers gourmet em pão brioche, os originais{' '}
            <strong className="text-white font-semibold">Caracóizzz</strong> e panuozzos
            estaladiços. Faz o teu pedido sem esperar e acompanha a cozinha ao segundo.
          </p>

          {/* Hero CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <Link
              href="/menu/gulas"
              className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition-all active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 cursor-pointer"
            >
              <Utensils className="w-4 h-4" />
              <span>Ver Menu &amp; Fazer Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://maps.google.com/?q=Gulas+Vila+das+Aves"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-orange-400" />
              <span>Localização</span>
            </a>
          </div>

          {/* Info Metrics Strip */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl text-left">
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-orange-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">
                  Horário de Serviço
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  12h00–15h00 • 19h00–23h00
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-emerald-400 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">
                  Take-Away Direto
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  Pizzas Familiares &amp; Balcão
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 backdrop-blur-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">
                  Tempo Real
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  Tracking ao vivo da cozinha
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Dishes Bento Grid */}
      <section className="py-14 sm:py-20 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Destaques da Cozinha</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              Especialidades feitas de raiz
            </h2>
          </div>
          <Link
            href="/menu/gulas"
            className="text-xs sm:text-sm font-bold text-zinc-700 hover:text-orange-600 flex items-center gap-1 group transition-colors"
          >
            <span>Explorar menu completo</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SIGNATURE_DISHES.map((dish) => (
            <Link
              key={dish.title}
              href="/menu/gulas"
              className="group rounded-2xl bg-white border border-zinc-200/80 overflow-hidden hover:border-zinc-300 hover:shadow-md transition-all duration-300 flex flex-col hover:-translate-y-0.5"
            >
              <div className="relative aspect-4/3 w-full bg-zinc-100 overflow-hidden">
                <Image
                  src={dish.image}
                  alt={dish.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wide">
                  {dish.tag}
                </span>
                <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md text-zinc-950 text-xs font-black font-mono shadow-xs">
                  desde {dish.priceFrom}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] uppercase font-bold text-orange-600 tracking-wide block mb-1">
                    {dish.category}
                  </span>
                  <h3 className="text-base font-black text-zinc-900 group-hover:text-orange-600 transition-colors">
                    {dish.title}
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                    {dish.desc}
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                  <span>Escolher no Menu</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Service Modes: Dine-in vs Take-away */}
      <section className="bg-white border-y border-zinc-200/80 py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 block mb-1.5">
              Experiência Digital
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
              Na sala ou para levar para casa
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 mt-2">
              Escolhe a modalidade de serviço e acompanha o estado do teu pedido em direto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Dine In */}
            <Link
              href="/menu/gulas/table/4"
              className="group p-6 sm:p-7 rounded-2xl bg-zinc-50 border border-zinc-200/90 hover:border-zinc-900 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-5 shadow-xs">
                  <QrCode className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="text-lg font-black text-zinc-950">
                  Pedido na Mesa via QR Code
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
                  Estás sentado no restaurante? Abre o menu com a tua mesa selecionada, adiciona os pratos e recebe tudo na mesa sem aguardar pela conta ou pelo registo.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200/80 flex items-center justify-between text-xs font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                <span>Simular Pedido na Mesa 4</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Take Away */}
            <Link
              href="/menu/gulas"
              className="group p-6 sm:p-7 rounded-2xl bg-zinc-50 border border-zinc-200/90 hover:border-zinc-900 hover:bg-white transition-all shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center mb-5 shadow-xs">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-zinc-950">
                  Take-Away &amp; Pizzas Familiares
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
                  Seleciona a opção Take-Away no carrinho, escolhe o tamanho Normal ou Familiar, indica o teu nome e acompanha quando estiver pronto a levantar no balcão.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-200/80 flex items-center justify-between text-xs font-bold text-zinc-900 group-hover:text-orange-600 transition-colors">
                <span>Encomendar para Take-Away</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-400 mt-auto border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-black text-white tracking-tight text-sm">GULAS</span>
            <span className="text-zinc-700">•</span>
            <span>Pizza, Burger &amp; Coffee</span>
            <span className="text-zinc-700">•</span>
            <span>Vila das Aves, Portugal</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="tel:+351252870120"
              className="hover:text-white transition-colors font-medium"
            >
              +351 252 870 120
            </a>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              <span>Área Staff / KDS</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
