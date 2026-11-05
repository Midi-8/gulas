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
} from 'lucide-react';

export const metadata = {
  title: 'GULAS — Pizza, Burger & Coffee (Vila das Aves)',
  description:
    'Menu digital e pedidos online do Gulas em Vila das Aves: Caracóizzz, Burgers artesanais, Pizzas de longa fermentação, Panuozzos e Take-away.',
};

const SIGNATURE_DISHES = [
  {
    title: 'Caracóizzz',
    category: 'Especialidade Gulas',
    desc: 'Massa de pizza artesanal enrolada com queijo derretido, bacon e recheios generosos.',
    image: '/images/produtos/caracoizz-cheddar-e-bacon.webp',
    tag: 'Exclusivo',
  },
  {
    title: 'Gulas Burger',
    category: 'Burgers Gourmet',
    desc: 'Carne selecionada, queijo fundido, bacon estaladiço e molho da casa em pão brioche tostado.',
    image: '/images/produtos/gulas-burger.webp',
    tag: 'Mais Pedido',
  },
  {
    title: 'Pizzas Artesanais',
    category: 'Longa Fermentação',
    desc: 'Base crocante de digestão leve, molho de tomate italiano e queijo mozzarella de excelência.',
    image: '/images/produtos/pepe-do-bosque.webp',
    tag: 'Artesanal',
  },
  {
    title: 'Panuozzos',
    category: 'Sanduíche Napolitana',
    desc: 'Pão de pizza assado no forno a alta temperatura, recheado com presunto e frescos.',
    image: '/images/produtos/panuozzo-iberico.webp',
    tag: 'Favorito',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#35271F] flex flex-col selection:bg-[#5E4939] selection:text-[#F5F4F1]">
      {/* Top Header */}
      <header className="border-b border-[#E5DED6] bg-[#F5F4F1]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5E4939] text-[#F5F4F1] flex items-center justify-center font-black text-lg tracking-wider shadow-xs">
              G
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-[#35271F] uppercase leading-none block">
                GULAS
              </span>
              <span className="text-[11px] font-bold text-[#C09573] leading-none">
                Pizza · Burger · Coffee
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="tel:+351252870120"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5DED6] bg-[#FFFFFF] hover:bg-[#EAE5DF] text-xs font-bold text-[#35271F] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#C09573]" />
              <span>252 870 120</span>
            </a>
            <Link
              href="/menu/gulas"
              className="px-4 py-2 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-xs sm:text-sm font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Ver Menu & Pedir</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EAE5DF]/60 to-[#F5F4F1] border-b border-[#E5DED6]">
        <div className="max-w-6xl mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 flex flex-col items-center text-center">
          {/* Badge Local */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E5DED6] text-[#5E4939] text-xs font-bold mb-6 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#C09573]" />
            <span>Vila das Aves, Portugal</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C09573]" />
            <span className="text-[#A89F95]">Take-Away &amp; Sala</span>
          </div>

          {/* Headline Principal */}
          <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-[#35271F] max-w-3xl leading-[1.12]">
            Sabores autênticos com o detalhe que a tua fome merece.
          </h1>

          <p className="mt-4 sm:mt-6 text-sm sm:text-base text-[#4C453F] max-w-xl font-normal leading-relaxed">
            Pizzas artesanais de longa fermentação, burgers gourmet em pão brioche, os inimitáveis <strong>Caracóizzz</strong> e panuozzos estaladiços. Pede na mesa ou leva para casa.
          </p>

          {/* Call-to-actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <Link
              href="/menu/gulas"
              className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-2xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-sm font-bold transition-all active:scale-98 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Utensils className="w-4 h-4 text-[#C09573]" />
              <span>Explorar Menu Digital</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://maps.google.com/?q=Gulas+Vila+das+Aves"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#EAE5DF] border border-[#E5DED6] text-[#35271F] text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <MapPin className="w-4 h-4 text-[#C09573]" />
              <span>Como Chegar</span>
            </a>
          </div>

          {/* Quick Info Strip */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DED6] shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EAE5DF] text-[#5E4939] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#C09573]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A89F95] block">Horário</span>
                <span className="text-xs font-bold text-[#35271F]">12h–15h • 19h–23h</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DED6] shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EAE5DF] text-[#5E4939] flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 text-[#C09573]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A89F95] block">Take-Away</span>
                <span className="text-xs font-bold text-[#35271F]">Encomenda sem filas</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5DED6] shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EAE5DF] text-[#5E4939] flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-[#C09573]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#A89F95] block">Qualidade</span>
                <span className="text-xs font-bold text-[#35271F]">Massa Artesanal</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Dishes Showcase */}
      <section className="py-14 sm:py-20 max-w-6xl mx-auto px-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-3">
          <div>
            <div className="inline-flex items-center gap-1 text-xs font-bold text-[#C09573] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Especialidades da Casa</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#35271F] tracking-tight">
              Os favoritos que conquistaram Vila das Aves
            </h2>
          </div>
          <Link
            href="/menu/gulas"
            className="text-xs sm:text-sm font-bold text-[#5E4939] hover:text-[#35271F] flex items-center gap-1 group"
          >
            <span>Ver toda a ementa</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SIGNATURE_DISHES.map((dish) => (
            <Link
              key={dish.title}
              href="/menu/gulas"
              className="group rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] overflow-hidden hover:border-[#C09573]/60 transition-all duration-300 shadow-xs flex flex-col hover:-translate-y-1"
            >
              <div className="relative aspect-4/3 w-full bg-[#EAE5DF] overflow-hidden">
                <Image
                  src={dish.image}
                  alt={dish.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
                <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-md bg-[#35271F]/80 backdrop-blur-sm text-[#F5F4F1] text-[10px] font-bold tracking-wide">
                  {dish.tag}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#C09573] block mb-1">
                    {dish.category}
                  </span>
                  <h3 className="text-base font-bold text-[#35271F] group-hover:text-[#5E4939] transition-colors">
                    {dish.title}
                  </h3>
                  <p className="text-xs text-[#4C453F] mt-1.5 leading-relaxed font-normal">
                    {dish.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E5DED6] flex items-center justify-between text-xs font-bold text-[#5E4939]">
                  <span>Pedir no Menu</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Service Modes: Dine-in vs Take-away */}
      <section className="bg-[#EAE5DF]/50 border-y border-[#E5DED6] py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[#35271F] tracking-tight">
              Como preferes saborear o teu Gulas?
            </h2>
            <p className="text-xs sm:text-sm text-[#4C453F] mt-2">
              Tecnologia pensada para não perderes tempo em filas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Dine In */}
            <Link
              href="/menu/gulas/table/4"
              className="group p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] hover:border-[#C09573]/70 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#5E4939] text-[#F5F4F1] flex items-center justify-center mb-4">
                  <QrCode className="w-6 h-6 text-[#C09573]" />
                </div>
                <h3 className="text-lg font-black text-[#35271F] group-hover:text-[#5E4939] transition-colors">
                  Na Mesa com QR Code
                </h3>
                <p className="text-xs text-[#4C453F] mt-2 leading-relaxed">
                  Lê o QR Code na tua mesa, faz o pedido diretamente pelo telemóvel e acompanha o progresso da cozinha em tempo real.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#E5DED6] flex items-center justify-between text-xs font-bold text-[#5E4939]">
                <span>Experimentar Mesa 4 (Demo)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Take Away */}
            <Link
              href="/menu/gulas"
              className="group p-6 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] hover:border-[#C09573]/70 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#EAE5DF] text-[#5E4939] flex items-center justify-center mb-4 border border-[#E5DED6]">
                  <ShoppingBag className="w-6 h-6 text-[#C09573]" />
                </div>
                <h3 className="text-lg font-black text-[#35271F] group-hover:text-[#5E4939] transition-colors">
                  Take-Away para Levar
                </h3>
                <p className="text-xs text-[#4C453F] mt-2 leading-relaxed">
                  Escolhe as tuas pizzas, burgers e bebidas, indica o teu nome e levanta confortavelmente ao balcão pronto e quente.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#E5DED6] flex items-center justify-between text-xs font-bold text-[#5E4939]">
                <span>Fazer Pedido Take-Away</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5DED6] bg-[#FFFFFF] mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#35271F]">GULAS</span>
            <span>— Pizza, Burger &amp; Coffee</span>
            <span>&bull;</span>
            <span>Vila das Aves, Portugal</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="tel:+351252870120"
              className="hover:text-[#35271F] transition-colors"
            >
              +351 252 870 120
            </a>
            <Link
              href="/admin/orders"
              className="text-[#A89F95] hover:text-[#5E4939] transition-colors font-medium"
            >
              Acesso Cozinha (KDS)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
