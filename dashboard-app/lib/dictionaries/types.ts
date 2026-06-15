export type Dictionary = {
  htmlLang: string;
  meta: {
    title: string;
    description: string;
  };
  nav: {
    brand: string;
    signIn: string;
    switchLanguage: string;
    switchLanguageLabel: string;
  };
  hero: {
    eyebrow: string;
    titleStart: string;
    titleAccent: string;
    titleEnd: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    screenshotAlt: string;
  };
  features: {
    eyebrow: string;
    heading: string;
    items: Array<{ title: string; body: string }>;
  };
  charts: {
    eyebrow: string;
    heading: string;
    items: Array<{
      src: string;
      title: string;
      body: string;
      alt: string;
    }>;
  };
  howItWorks: {
    eyebrow: string;
    heading: string;
    steps: Array<{ step: string; title: string; body: string }>;
  };
  cta: {
    title: string;
    body: string;
    button: string;
  };
  footer: {
    brand: string;
    note: string;
  };
  screenshot: {
    expandLabel: string;
    expandBadge: string;
    enlargedDialogLabel: string;
    closeLabel: string;
  };
};
