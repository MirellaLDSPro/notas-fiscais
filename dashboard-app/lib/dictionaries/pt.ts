import type { Dictionary } from "./types";

export const pt: Dictionary = {
  htmlLang: "pt-BR",
  meta: {
    title: "Painel NFC-e",
    description: "Dashboard de cupons fiscais (NFC-e) com upload de PDF.",
  },
  nav: {
    brand: "Painel NFC-e",
    signIn: "Entrar",
    switchLanguage: "EN",
    switchLanguageLabel: "Ver em inglês",
  },
  hero: {
    eyebrow: "Seus cupons fiscais, organizados",
    titleStart: "Entenda quanto você gasta no",
    titleAccent: " dia a dia",
    titleEnd: ", a partir dos seus próprios cupons.",
    description:
      "Suba PDFs de NFC-e ou escaneie o QR code do cupom. O painel agrupa tudo por mês, categoria e produto — pra você ver pra onde está indo o dinheiro do supermercado.",
    ctaPrimary: "Entrar com Google",
    ctaSecondary: "Ver recursos",
    screenshotAlt:
      "Visão do painel NFC-e com totais, gráficos e upload de cupons",
  },
  features: {
    eyebrow: "Recursos",
    heading: "Tudo o que dá pra fazer com os seus cupons",
    items: [
      {
        title: "Importação de cupons",
        body:
          "Envie PDFs ou escaneie QR codes de NFC-e e o sistema extrai produtos, valores e emitente automaticamente.",
      },
      {
        title: "Dashboard de gastos",
        body:
          "Veja quanto você gastou por mês, por categoria e por estabelecimento, com gráficos prontos.",
      },
      {
        title: "Preços por período",
        body:
          "Descubra em que época do ano cada produto fica mais barato e planeje suas compras.",
      },
      {
        title: "Lista de compras inteligente",
        body:
          "O painel identifica o que você compra com frequência e sugere uma lista baseada no seu histórico.",
      },
      {
        title: "Receitas com o que você tem",
        body:
          "Receba sugestões de receitas a partir dos itens das suas últimas notas fiscais.",
      },
      {
        title: "Inflação da sua cesta",
        body:
          "Acompanhe a variação de preço dos seus produtos pessoais ao longo do tempo, e não a média do IBGE.",
      },
    ],
  },
  charts: {
    eyebrow: "O que você vê no painel",
    heading: "Seus gastos, em gráficos prontos",
    items: [
      {
        src: "/landing-chart-gasto-compra.png",
        title: "Gasto por compra",
        body:
          "Veja o valor de cada nota fiscal ao longo do tempo e identifique os picos do mês.",
        alt: "Gráfico de barras mostrando o gasto de cada nota fiscal por data",
      },
      {
        src: "/landing-chart-onde-dinheiro.png",
        title: "Onde o dinheiro foi",
        body:
          "Ranking dos produtos que mais pesam no seu orçamento — útil pra repensar prioridades.",
        alt: "Gráfico horizontal com os 8 produtos de maior gasto acumulado",
      },
      {
        src: "/landing-chart-categoria.png",
        title: "Gasto por categoria",
        body:
          "Agrupamento automático por tipo de produto (carne, vinho, queijo, leite…) com totais acumulados.",
        alt: "Gráfico horizontal com as 10 categorias de maior gasto",
      },
      {
        src: "/landing-chart-preco.png",
        title: "Evolução de preço",
        body:
          "Acompanhe como o preço unitário de um produto específico se comporta ao longo do tempo.",
        alt: "Gráfico de linha mostrando a evolução do preço unitário de um produto",
      },
      {
        src: "/landing-chart-mes.png",
        title: "Preço médio por mês",
        body:
          "Veja em quais meses do ano o produto costuma ficar mais barato e planeje compras na sazonalidade certa.",
        alt: "Gráfico de linha mostrando o preço médio por mês de emissão",
      },
      {
        src: "/landing-chart-dia-semana.png",
        title: "Preço por dia da semana",
        body:
          "Identifique promoções recorrentes (ex.: hortifrúti mais barato na quarta) e otimize o dia da compra.",
        alt: "Gráfico de barras com o preço médio por dia da semana",
      },
    ],
  },
  howItWorks: {
    eyebrow: "Como funciona",
    heading: "Em três passos",
    steps: [
      {
        step: "01",
        title: "Capture o cupom",
        body:
          "Faça upload do PDF da NFC-e ou aponte a câmera pro QR code impresso no cupom.",
      },
      {
        step: "02",
        title: "Deixe o painel ler",
        body:
          "Produtos, valores, emitente e data são extraídos automaticamente — nada de digitar.",
      },
      {
        step: "03",
        title: "Use os insights",
        body:
          "Acompanhe gastos por mês, descubra padrões de preço e receba sugestões de compras.",
      },
    ],
  },
  cta: {
    title: "Pronto pra entrar?",
    body: "Acesso restrito a contas autorizadas pelo Google.",
    button: "Entrar com Google",
  },
  footer: {
    brand: "painel NFC-e · v0.1",
    note: "uso pessoal · acesso restrito",
  },
  screenshot: {
    expandLabel: "Expandir screenshot do painel",
    expandBadge: "Expandir",
    enlargedDialogLabel: "Screenshot ampliado do painel",
    closeLabel: "Fechar",
  },
};
