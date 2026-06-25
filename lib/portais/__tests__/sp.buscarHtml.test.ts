import { describe, it, expect, vi, afterEach } from "vitest";
import { buscarHtml, detectarCaptcha } from "@/lib/portais/sp";

const NFCE_OK = "<html><body>NOTA FISCAL DE CONSUMIDOR ELETRÔNICA ... itens ...</body></html>";
const CAPTCHA = "<html><body><div class='g-recaptcha'></div>Digite o captcha</body></html>";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(body: string, init?: { ok?: boolean; status?: number; contentType?: string }) {
  const buf = Buffer.from(body, "latin1");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: init?.ok ?? true,
      status: init?.status ?? 200,
      headers: new Map([["content-type", init?.contentType ?? "text/html; charset=ISO-8859-1"]]) as any,
      arrayBuffer: async () => buf,
    }))
  );
}

describe("detectarCaptcha", () => {
  it("true quando há marcador de captcha", () => expect(detectarCaptcha(CAPTCHA)).toBe(true));
  it("true quando não há marcador de NFC-e (página inesperada)", () =>
    expect(detectarCaptcha("<html>erro</html>")).toBe(true));
  it("false numa NFC-e válida", () => expect(detectarCaptcha(NFCE_OK)).toBe(false));
});

describe("buscarHtml", () => {
  it("retorna ok+html numa resposta de NFC-e", async () => {
    stubFetch(NFCE_OK);
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r).toEqual({ ok: true, html: expect.stringContaining("CONSUMIDOR") });
  });

  it("retorna captcha quando a página pede captcha", async () => {
    stubFetch(CAPTCHA);
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r).toEqual({ ok: false, captcha: true });
  });

  it("retorna erro em status HTTP ruim", async () => {
    stubFetch("", { ok: false, status: 503 });
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("503");
  });

  it("retorna erro quando o fetch lança", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );
    const r = await buscarHtml("https://www.nfce.fazenda.sp.gov.br/qrcode?p=x");
    expect(r.ok).toBe(false);
  });
});
