import type { Cadence, Ownership } from "./domain.js";

export type PopularSubscriptionTemplate = {
  id: string;
  country: string;
  merchant: string;
  category: string;
  cadence: Cadence;
  defaultOwner: Ownership;
  ownerLabel: string;
  priceHint: string;
  defaultAmount: number | null;
  logoUrl: string;
  brandColor: string;
};

const catalog: Record<string, PopularSubscriptionTemplate[]> = {
  ES: [
    template("es-netflix", "ES", "Netflix", "Entertainment", "monthly", "shared", "Household", "From 6.99 EUR", "https://logo.clearbit.com/netflix.com", "#e50914"),
    template("es-prime-video", "ES", "Amazon Prime Video", "Entertainment", "monthly", "shared", "Household", "Prime from 4.99 EUR", "https://logo.clearbit.com/primevideo.com", "#00a8e1"),
    template("es-movistar-plus", "ES", "Movistar Plus+", "Entertainment", "monthly", "shared", "Household", "From 9.99 EUR", "https://logo.clearbit.com/movistarplus.es", "#0098d8"),
    template("es-disney-plus", "ES", "Disney+", "Entertainment", "monthly", "shared", "Household", "From 5.99 EUR", "https://logo.clearbit.com/disneyplus.com", "#113ccf"),
    template("es-max", "ES", "Max", "Entertainment", "monthly", "shared", "Household", "From 6.99 EUR", "https://logo.clearbit.com/max.com", "#1d0bff"),
    template("es-dazn", "ES", "DAZN", "Sports", "monthly", "shared", "Household", "From 19.99 EUR", "https://logo.clearbit.com/dazn.com", "#111111"),
    template("es-basic-fit", "ES", "Basic-Fit", "Fitness", "monthly", "personal", "Benjamin", "24.99 EUR / 4 weeks", "https://logo.clearbit.com/basic-fit.com", "#ff6500"),
    template("es-filmin", "ES", "Filmin", "Entertainment", "monthly", "shared", "Household", "From 7.99 EUR", "https://logo.clearbit.com/filmin.es", "#00a1ff"),
    template("es-atresplayer", "ES", "Atresplayer Premium", "Entertainment", "monthly", "shared", "Household", "From 5.99 EUR", "https://logo.clearbit.com/atresplayer.com", "#ff5a36"),
    template("es-spotify", "ES", "Spotify Premium", "Music", "monthly", "shared", "Household", "From 10.99 EUR", "https://logo.clearbit.com/spotify.com", "#1db954"),
    template("es-youtube-premium", "ES", "YouTube Premium", "Entertainment", "monthly", "personal", "Benjamin", "From 11.99 EUR", "https://logo.clearbit.com/youtube.com", "#ff0033"),
    template("es-apple-one", "ES", "Apple One", "Bundle", "monthly", "shared", "Household", "From 19.95 EUR", "https://logo.clearbit.com/apple.com", "#111111"),
    template("es-icloud", "ES", "iCloud+", "Cloud", "monthly", "shared", "Household", "From 0.99 EUR", "https://logo.clearbit.com/icloud.com", "#0a84ff"),
    template("es-chatgpt-plus", "ES", "ChatGPT Plus", "AI", "monthly", "personal", "Benjamin", "From 20.00 EUR", "https://logo.clearbit.com/openai.com", "#111111"),
    template("es-microsoft-365", "ES", "Microsoft 365", "Productivity", "monthly", "shared", "Household", "From 7.00 EUR", "https://logo.clearbit.com/microsoft.com", "#7fba00"),
    template("es-revolut-premium", "ES", "Revolut Premium", "Banking", "monthly", "personal", "Benjamin", "8.99 EUR / month", "https://logo.clearbit.com/revolut.com", "#111111"),
    template("es-n26-you", "ES", "N26 You", "Banking", "monthly", "personal", "Benjamin", "9.90 EUR / month", "https://logo.clearbit.com/n26.com", "#2bb7a9"),
    template("es-ps-plus", "ES", "PlayStation Plus", "Gaming", "monthly", "personal", "Benjamin", "From 8.99 EUR", "https://logo.clearbit.com/playstation.com", "#003791"),
    template("es-switch-online", "ES", "Nintendo Switch Online", "Gaming", "monthly", "personal", "Benjamin", "From 3.99 EUR", "https://logo.clearbit.com/nintendo.com", "#e60012"),
    template("es-audible", "ES", "Audible", "Books", "monthly", "personal", "Benjamin", "From 9.99 EUR", "https://logo.clearbit.com/audible.com", "#f8991c"),
    template("es-movistar-fibra", "ES", "Movistar Fibra + Móvil", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/movistar.es", "#0098d8"),
    template("es-orange-fibra", "ES", "Orange Fibra + Móvil", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/orange.es", "#ff7900"),
    template("es-vodafone-fibra", "ES", "Vodafone Fibra + Móvil", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/vodafone.es", "#e60000"),
    template("es-digi", "ES", "DIGI Fibra + Móvil", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/digimobil.es", "#0057b8"),
  ],
  FR: [
    template("fr-netflix", "FR", "Netflix", "Entertainment", "monthly", "shared", "Household", "From 5.99 EUR", "https://logo.clearbit.com/netflix.com", "#e50914"),
    template("fr-prime-video", "FR", "Amazon Prime Video", "Entertainment", "monthly", "shared", "Household", "Prime from 6.99 EUR", "https://logo.clearbit.com/primevideo.com", "#00a8e1"),
    template("fr-canal-plus", "FR", "Canal+", "Entertainment", "monthly", "shared", "Household", "From 22.99 EUR", "https://logo.clearbit.com/canalplus.com", "#111111"),
    template("fr-disney-plus", "FR", "Disney+", "Entertainment", "monthly", "shared", "Household", "From 5.99 EUR", "https://logo.clearbit.com/disneyplus.com", "#113ccf"),
    template("fr-max", "FR", "Max", "Entertainment", "monthly", "shared", "Household", "From 5.99 EUR", "https://logo.clearbit.com/max.com", "#1d0bff"),
    template("fr-apple-tv", "FR", "Apple TV+", "Entertainment", "monthly", "shared", "Household", "From 9.99 EUR", "https://logo.clearbit.com/apple.com", "#111111"),
    template("fr-molotov", "FR", "Molotov", "Entertainment", "monthly", "shared", "Household", "From 6.99 EUR", "https://logo.clearbit.com/molotov.tv", "#6c43ff"),
    template("fr-dazn", "FR", "DAZN", "Sports", "monthly", "shared", "Household", "From 19.99 EUR", "https://logo.clearbit.com/dazn.com", "#111111"),
    template("fr-basic-fit", "FR", "Basic-Fit", "Fitness", "monthly", "personal", "Benjamin", "24.99 EUR / 4 weeks", "https://logo.clearbit.com/basic-fit.com", "#ff6500"),
    template("fr-deezer", "FR", "Deezer Premium", "Music", "monthly", "personal", "Benjamin", "From 11.99 EUR", "https://logo.clearbit.com/deezer.com", "#a238ff"),
    template("fr-spotify", "FR", "Spotify Premium", "Music", "monthly", "shared", "Household", "From 10.99 EUR", "https://logo.clearbit.com/spotify.com", "#1db954"),
    template("fr-youtube-premium", "FR", "YouTube Premium", "Entertainment", "monthly", "personal", "Benjamin", "From 12.99 EUR", "https://logo.clearbit.com/youtube.com", "#ff0033"),
    template("fr-apple-one", "FR", "Apple One", "Bundle", "monthly", "shared", "Household", "From 19.95 EUR", "https://logo.clearbit.com/apple.com", "#111111"),
    template("fr-icloud", "FR", "iCloud+", "Cloud", "monthly", "shared", "Household", "From 0.99 EUR", "https://logo.clearbit.com/icloud.com", "#0a84ff"),
    template("fr-chatgpt-plus", "FR", "ChatGPT Plus", "AI", "monthly", "personal", "Benjamin", "From 20.00 EUR", "https://logo.clearbit.com/openai.com", "#111111"),
    template("fr-microsoft-365", "FR", "Microsoft 365", "Productivity", "monthly", "shared", "Household", "From 7.00 EUR", "https://logo.clearbit.com/microsoft.com", "#7fba00"),
    template("fr-revolut-premium", "FR", "Revolut Premium", "Banking", "monthly", "personal", "Benjamin", "9.99 EUR / month", "https://logo.clearbit.com/revolut.com", "#111111"),
    template("fr-boursobank-metal", "FR", "BoursoBank Metal", "Banking", "monthly", "personal", "Benjamin", "From 9.90 EUR", "https://logo.clearbit.com/boursobank.com", "#ec008c"),
    template("fr-ps-plus", "FR", "PlayStation Plus", "Gaming", "monthly", "personal", "Benjamin", "From 8.99 EUR", "https://logo.clearbit.com/playstation.com", "#003791"),
    template("fr-switch-online", "FR", "Nintendo Switch Online", "Gaming", "monthly", "personal", "Benjamin", "From 3.99 EUR", "https://logo.clearbit.com/nintendo.com", "#e60012"),
    template("fr-le-monde", "FR", "Le Monde", "News", "monthly", "shared", "Household", "Digital news plan", "https://logo.clearbit.com/lemonde.fr", "#111111"),
    template("fr-orange", "FR", "Orange Livebox + Mobile", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/orange.fr", "#ff7900"),
    template("fr-sfr", "FR", "SFR Box + Mobile", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/sfr.fr", "#e30613"),
    template("fr-free", "FR", "Freebox + Mobile", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/free.fr", "#d80c18"),
    template("fr-bouygues", "FR", "Bouygues Bbox + Mobile", "Telecom", "monthly", "shared", "Household", "Home bundle", "https://logo.clearbit.com/bouyguestelecom.fr", "#00a0df"),
  ],
};

export function getPopularSubscriptions(country: string) {
  return catalog[country.toUpperCase()] ?? catalog.ES;
}

function template(
  id: string,
  country: string,
  merchant: string,
  category: string,
  cadence: Cadence,
  defaultOwner: Ownership,
  ownerLabel: string,
  priceHint: string,
  logoUrl: string,
  brandColor: string,
): PopularSubscriptionTemplate {
  return {
    id,
    country,
    merchant,
    category,
    cadence,
    defaultOwner,
    ownerLabel,
    priceHint,
    defaultAmount: deriveDefaultAmount(priceHint),
    logoUrl,
    brandColor,
  };
}

function deriveDefaultAmount(priceHint: string) {
  const match = priceHint.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  return Number.parseFloat(match[1]);
}
