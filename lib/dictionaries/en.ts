import type { Dictionary } from "./types";

export const en: Dictionary = {
  htmlLang: "en",
  meta: {
    title: "NFC-e Dashboard",
    description:
      "Dashboard for Brazilian electronic receipts (NFC-e) with PDF upload.",
  },
  nav: {
    brand: "NFC-e Dashboard",
    signIn: "Sign in",
    switchLanguage: "PT",
    switchLanguageLabel: "Ver em português",
  },
  hero: {
    eyebrow: "Your grocery receipts, organized",
    titleStart: "Understand how much you spend",
    titleAccent: " day to day",
    titleEnd: ", straight from your own receipts.",
    description:
      "Upload NFC-e PDFs or scan the QR code on the receipt. The dashboard groups everything by month, category, and product — so you can see where your grocery money is going.",
    ctaPrimary: "Sign in with Google",
    ctaSecondary: "See features",
    screenshotAlt:
      "NFC-e dashboard view with totals, charts, and receipt upload",
  },
  features: {
    eyebrow: "Features",
    heading: "Everything you can do with your receipts",
    items: [
      {
        title: "Receipt import",
        body:
          "Upload PDFs or scan QR codes from NFC-e receipts and the system extracts products, prices, and issuer automatically.",
      },
      {
        title: "Spending dashboard",
        body:
          "See how much you spent by month, by category, and by store, with ready-made charts.",
      },
      {
        title: "Prices over time",
        body:
          "Find out which time of year each product is cheaper and plan your purchases accordingly.",
      },
      {
        title: "Smart shopping list",
        body:
          "The dashboard spots what you buy often and suggests a list based on your history.",
      },
      {
        title: "Recipes from what you have",
        body:
          "Get recipe suggestions based on items from your most recent receipts.",
      },
      {
        title: "Your personal inflation",
        body:
          "Track the price variation of your own products over time — not the official inflation average.",
      },
    ],
  },
  charts: {
    eyebrow: "What you see in the dashboard",
    heading: "Your spending, in ready-made charts",
    items: [
      {
        src: "/landing-chart-gasto-compra.png",
        title: "Spending per purchase",
        body:
          "See the value of each receipt over time and spot the spikes of the month.",
        alt: "Bar chart showing the total spent on each receipt by date",
      },
      {
        src: "/landing-chart-onde-dinheiro.png",
        title: "Where the money went",
        body:
          "Ranking of the products that weigh the most on your budget — useful for rethinking priorities.",
        alt: "Horizontal chart with the top 8 products by accumulated spending",
      },
      {
        src: "/landing-chart-categoria.png",
        title: "Spending by category",
        body:
          "Automatic grouping by product type (meat, wine, cheese, milk…) with running totals.",
        alt: "Horizontal chart with the top 10 categories by spending",
      },
      {
        src: "/landing-chart-preco.png",
        title: "Price evolution",
        body:
          "Track how the unit price of a specific product behaves over time.",
        alt: "Line chart showing the unit-price evolution of a product",
      },
      {
        src: "/landing-chart-mes.png",
        title: "Average price by month",
        body:
          "See which months of the year a product is usually cheaper and plan around its seasonality.",
        alt: "Line chart showing the average price by issue month",
      },
      {
        src: "/landing-chart-dia-semana.png",
        title: "Price by day of the week",
        body:
          "Spot recurring deals (e.g., produce is cheapest on Wednesdays) and pick the best shopping day.",
        alt: "Bar chart with the average price by day of the week",
      },
    ],
  },
  howItWorks: {
    eyebrow: "How it works",
    heading: "In three steps",
    steps: [
      {
        step: "01",
        title: "Capture the receipt",
        body:
          "Upload the NFC-e PDF or point your camera at the QR code printed on the receipt.",
      },
      {
        step: "02",
        title: "Let the dashboard read it",
        body:
          "Products, prices, issuer, and date are extracted automatically — no typing required.",
      },
      {
        step: "03",
        title: "Use the insights",
        body:
          "Track monthly spending, uncover price patterns, and get shopping suggestions.",
      },
    ],
  },
  cta: {
    title: "Ready to sign in?",
    body: "Access restricted to accounts authorized via Google.",
    button: "Sign in with Google",
  },
  footer: {
    brand: "NFC-e dashboard · v0.1",
    note: "personal use · restricted access",
  },
  screenshot: {
    expandLabel: "Expand dashboard screenshot",
    expandBadge: "Expand",
    enlargedDialogLabel: "Enlarged dashboard screenshot",
    closeLabel: "Close",
  },
};
