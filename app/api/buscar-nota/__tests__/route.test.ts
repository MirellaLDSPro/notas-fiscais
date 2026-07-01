import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixtureHtml = readFileSync(
  resolve(__dirname, "../../../../lib/__tests__/fixtures/nfce-sp.html"),
  "utf8"
);
const fixtureXml = readFileSync(
  resolve(__dirname, "../../../../lib/__tests__/fixtures/nfce-pe.xml"),
  "utf8"
);

const CHAVE = "35".padEnd(44, "1"); // valor só para o mock; extrairChave é mockado

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({ user: { email: "a@b.com" } })),
  userIdFromSession: vi.fn(() => 1),
}));
vi.mock("@/lib/portais/sp", () => ({
  extrairChave: vi.fn(),
  buscarHtml: vi.fn(),
}));
vi.mock("@/lib/ocrNfce", () => ({
  parseNfceTextViaClaude: vi.fn(async () => ({ ok: false, partial: {} })),
}));
vi.mock("@/lib/db", () => ({
  notaExistsByChave: vi.fn(async () => false),
  upsertNota: vi.fn(async () => ({ id: 10, action: "inserted" })),
  upsertEstabelecimento: vi.fn(async () => "inserted"),
  recordNotaErro: vi.fn(async () => "inserted"),
}));

import { POST } from "@/app/api/buscar-nota/route";
import { extrairChave, buscarHtml } from "@/lib/portais/sp";
import { notaExistsByChave, upsertNota, recordNotaErro } from "@/lib/db";
import { parseNfceTextViaClaude } from "@/lib/ocrNfce";

function req(body: unknown) {
  return new Request("http://t/api/buscar-nota", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks limpa o histórico mas mantém implementações; restabelecemos
  // os defaults para que overrides de um teste não vazem para o próximo.
  (extrairChave as any).mockReturnValue({
    chave: CHAVE,
    uf: "35",
    url: "https://www.nfce.fazenda.sp.gov.br/qrcode?p=x",
    ufSuportada: true,
  });
  (notaExistsByChave as any).mockResolvedValue(false);
  (upsertNota as any).mockResolvedValue({ id: 10, action: "inserted" });
});

describe("POST /api/buscar-nota", () => {
  it("input vazio → invalid 400", async () => {
    const res = await POST(req({ input: "" }));
    expect(res.status).toBe(400);
    expect((await res.json()).status).toBe("invalid");
  });

  it("UF fora do registro (RJ) → unsupported_uf", async () => {
    (extrairChave as any).mockReturnValue({ chave: CHAVE, uf: "33", url: null, ufSuportada: false });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("unsupported_uf");
    expect(body.message).toContain("Pernambuco");
    expect(buscarHtml).not.toHaveBeenCalled();
  });

  it("chave PE digitada (UF ok, sem url) → invalid, sem buscar", async () => {
    (extrairChave as any).mockReturnValue({ chave: CHAVE, uf: "26", url: null, ufSuportada: true });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("invalid");
    expect(body.message).toContain("Escaneie o QR");
    expect(buscarHtml).not.toHaveBeenCalled();
  });

  it("URL PE → XML parseado deterministicamente → ok/inserted, fonte BUSCA", async () => {
    (extrairChave as any).mockReturnValue({
      chave: CHAVE,
      uf: "26",
      url: "https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?p=x",
      ufSuportada: true,
    });
    (buscarHtml as any).mockResolvedValue({ ok: true, html: fixtureXml });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.action).toBe("inserted");
    expect(body.fonte).toBe("BUSCA");
    expect(body.nota.itens).toBe(4);
  });

  it("nota já existente → ok/exists, sem buscar", async () => {
    (notaExistsByChave as any).mockResolvedValue(true);
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.action).toBe("exists");
    expect(buscarHtml).not.toHaveBeenCalled();
  });

  it("captcha → status captcha, sem upsert", async () => {
    (buscarHtml as any).mockResolvedValue({ ok: false, captcha: true });
    const res = await POST(req({ input: "x" }));
    expect((await res.json()).status).toBe("captcha");
    expect(upsertNota).not.toHaveBeenCalled();
  });

  it("HTML válido → ok/inserted, fonte BUSCA, upsert chamado", async () => {
    (buscarHtml as any).mockResolvedValue({ ok: true, html: fixtureHtml });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.action).toBe("inserted");
    expect(body.fonte).toBe("BUSCA");
    expect(upsertNota).toHaveBeenCalledOnce();
  });

  it("envelope de erro da SEFAZ (PE recusou o QR) → error específico, grava erro, NÃO chama IA", async () => {
    (extrairChave as any).mockReturnValue({
      chave: CHAVE,
      uf: "26",
      url: "https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?p=x",
      ufSuportada: true,
    });
    const erroEnvelope =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">' +
      "<erro>100</erro><consulta>0</consulta><dataHora>30/06/2026 18:38:55</dataHora></nfeProc>";
    (buscarHtml as any).mockResolvedValue({ ok: true, html: erroEnvelope });
    const res = await POST(req({ input: "x" }));
    const body = await res.json();
    expect(body.status).toBe("error");
    expect(body.message).toMatch(/QR|Fazenda|SEFAZ/i);
    expect(parseNfceTextViaClaude).not.toHaveBeenCalled();
    expect(recordNotaErro).toHaveBeenCalledOnce();
    expect(upsertNota).not.toHaveBeenCalled();
  });

  it("parse falha e IA falha → error + recordNotaErro", async () => {
    (buscarHtml as any).mockResolvedValue({ ok: true, html: "<html>lixo</html>" });
    const res = await POST(req({ input: "x" }));
    expect((await res.json()).status).toBe("error");
    expect(recordNotaErro).toHaveBeenCalledOnce();
  });
});
