'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Locale = 'pt' | 'en' | 'fr';

const LOCALE_STORAGE_KEY = 'gulas_locale_v1';

const DICTIONARY = {
  pt: {
    open: 'Aberto',
    closed: 'Encerrado',
    closedNotice: 'O restaurante encontra-se encerrado de momento para novos pedidos.',
    table: 'Mesa',
    takeAway: 'Take-Away',
    tableOrTakeAway: 'Mesa / Levar',
    billOrStaff: 'Conta / Staff',
    tableAssistance: 'Assistência na Mesa',
    billCard: 'Pedir a Conta · Multibanco / MB WAY',
    billCardDesc: 'O staff leva o terminal de pagamento à mesa',
    billCash: 'Pedir a Conta · Dinheiro',
    billCashDesc: 'Pagamento em numerário na mesa',
    callStaff: 'Chamar Staff à Mesa',
    callStaffDesc: 'Dúvida, guardanapos, talheres ou assistência',
    nifLabel: 'NIF na fatura (opcional)',
    confirmCall: 'Confirmar Pedido à Equipa',
    sendingCall: 'A chamar staff...',
    callReceived: 'A equipa já recebeu o teu pedido!',
    callReceivedDesc: 'Um membro do staff irá dirigir-se à mesa em breve.',
    searchPlaceholder: 'Pesquisar prato, bebida ou ingrediente...',
    all: 'Todos',
    specialties: 'Especialidades',
    new: 'Novidades',
    spicy: 'Picantes',
    vegetarian: 'Vegetarianos',
    glutenFree: 'Sem Glúten',
    lactoseFree: 'Sem Lactose',
    serviceNotesTitle: 'Pizzas Familiares exclusivas Take-Away · Alergénios',
    emptySearchTitle: 'Nenhum artigo encontrado',
    emptySearchDesc: 'Tenta alterar os termos da pesquisa ou remover o filtro selecionado.',
    viewOrder: 'Ver o teu pedido',
    novidade: 'Novidade',
    picante: 'Picante',
    vegetariano: 'Vegetariano',
    vegan: 'Vegan',
    especialidade: 'Especialidade',
    house_special: 'Especial Gulas',
    popular: 'Popular',
    promocao: 'Promoção',
    extra: 'Extra',
    acompanhamento: 'Acompanhamento',
    outOfStock: 'Esgotado',
    unavailable: 'Indisponível',
    allergensPrefix: 'Alergénios',
  },
  en: {
    open: 'Open',
    closed: 'Closed',
    closedNotice: 'The restaurant is currently closed for new digital orders.',
    table: 'Table',
    takeAway: 'Take-Away',
    tableOrTakeAway: 'Table / Take-Away',
    billOrStaff: 'Bill / Staff',
    tableAssistance: 'Table Assistance',
    billCard: 'Ask for the Bill · Card / MB WAY',
    billCardDesc: 'Staff will bring the card terminal to your table',
    billCash: 'Ask for the Bill · Cash',
    billCashDesc: 'Cash payment at the table',
    callStaff: 'Call Waiter / Staff',
    callStaffDesc: 'Questions, napkins, cutlery or assistance',
    nifLabel: 'Tax ID / NIF (optional)',
    confirmCall: 'Send Request to Team',
    sendingCall: 'Calling staff...',
    callReceived: 'The team has received your request!',
    callReceivedDesc: 'A staff member will be at your table shortly.',
    searchPlaceholder: 'Search dish, drink or ingredient...',
    all: 'All',
    specialties: 'Specialties',
    new: 'New',
    spicy: 'Spicy',
    vegetarian: 'Vegetarian',
    glutenFree: 'Gluten-Free',
    lactoseFree: 'Lactose-Free',
    serviceNotesTitle: 'Family Pizzas Take-Away only · Allergens',
    emptySearchTitle: 'No items found',
    emptySearchDesc: 'Try changing your search query or clearing the active filter.',
    viewOrder: 'View your order',
    novidade: 'New',
    picante: 'Spicy',
    vegetariano: 'Vegetarian',
    vegan: 'Vegan',
    especialidade: 'Specialty',
    house_special: 'Gulas Special',
    popular: 'Popular',
    promocao: 'Promo',
    extra: 'Extra',
    acompanhamento: 'Side',
    outOfStock: 'Sold Out',
    unavailable: 'Unavailable',
    allergensPrefix: 'Allergens',
  },
  fr: {
    open: 'Ouvert',
    closed: 'Fermé',
    closedNotice: 'Le restaurant est actuellement fermé aux nouvelles commandes.',
    table: 'Table',
    takeAway: 'À Emporter',
    tableOrTakeAway: 'Table / Emporter',
    billOrStaff: 'Addition / Staff',
    tableAssistance: 'Assistance à Table',
    billCard: 'Demander l’Addition · Carte Bancaire',
    billCardDesc: 'Un serveur apportera le terminal à votre table',
    billCash: 'Demander l’Addition · Espèces',
    billCashDesc: 'Paiement en espèces à la table',
    callStaff: 'Appeler un Serveur',
    callStaffDesc: 'Question, serviettes, couverts ou aide',
    nifLabel: 'Numéro fiscal (optionnel)',
    confirmCall: 'Envoyer la Demande',
    sendingCall: 'Appel en cours...',
    callReceived: 'L’équipe a bien reçu votre demande !',
    callReceivedDesc: 'Un membre de l’équipe arrive à votre table.',
    searchPlaceholder: 'Rechercher un plat, boisson ou ingrédient...',
    all: 'Tous',
    specialties: 'Spécialités',
    new: 'Nouveautés',
    spicy: 'Épicé',
    vegetarian: 'Végétarien',
    glutenFree: 'Sans Gluten',
    lactoseFree: 'Sans Lactose',
    serviceNotesTitle: 'Pizzas Familiales à emporter uniquement · Allergènes',
    emptySearchTitle: 'Aucun article trouvé',
    emptySearchDesc: 'Essayez de modifier votre recherche ou de retirer le filtre.',
    viewOrder: 'Voir votre commande',
    novidade: 'Nouveau',
    picante: 'Épicé',
    vegetariano: 'Végétarien',
    vegan: 'Vegan',
    especialidade: 'Spécialité',
    house_special: 'Spécial Gulas',
    popular: 'Populaire',
    promocao: 'Promo',
    extra: 'Supplément',
    acompanhamento: 'Accompagnement',
    outOfStock: 'Épuisé',
    unavailable: 'Indisponible',
    allergensPrefix: 'Allergènes',
  },
} as const;

export type TranslationKey = keyof typeof DICTIONARY.pt;

const CATEGORY_MAP: Record<string, { en: string; fr: string }> = {
  entradas: { en: 'Starters', fr: 'Entrées' },
  pizzas: { en: 'Wood-Fired Pizzas', fr: 'Pizzas Artisanales' },
  hambúrgueres: { en: 'Artisanal Burgers', fr: 'Burgers Artisanaux' },
  burgers: { en: 'Artisanal Burgers', fr: 'Burgers Artisanaux' },
  'burgers artesanais': { en: 'Artisanal Burgers', fr: 'Burgers Artisanaux' },
  sobremesas: { en: 'Desserts', fr: 'Desserts' },
  bebidas: { en: 'Drinks', fr: 'Boissons' },
  acompanhamentos: { en: 'Sides', fr: 'Accompagnements' },
  pregos: { en: 'Steak Sandwiches', fr: 'Sandwichs au Bœuf' },
  panuozzos: { en: 'Panuozzos', fr: 'Panuozzos' },
  caracóizzz: { en: 'Caracóizzz (House Signature)', fr: 'Caracóizzz (Spécialité)' },
  cafetaria: { en: 'Coffee & Pastry', fr: 'Café & Douceurs' },
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: TranslationKey) => string;
  translateCategoryName: (name: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === 'pt' || saved === 'en' || saved === 'fr') {
        queueMicrotask(() => setLocaleState(saved));
      }
    } catch {
      // Ignorar
    }
  }, []);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, loc);
    } catch {
      // Ignorar
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return DICTIONARY[locale][key] || DICTIONARY.pt[key];
    },
    [locale]
  );

  const translateCategoryName = useCallback(
    (name: string): string => {
      if (locale === 'pt') return name;
      const lower = name.trim().toLowerCase();
      for (const [key, trans] of Object.entries(CATEGORY_MAP)) {
        if (lower === key || lower.includes(key)) {
          return trans[locale];
        }
      }
      return name;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, translateCategoryName }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      locale: 'pt',
      setLocale: () => {},
      t: (key) => DICTIONARY.pt[key],
      translateCategoryName: (name) => name,
    };
  }
  return ctx;
}
