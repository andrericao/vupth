import fs from "fs";
import path from "path";

// avisar-quando-abrir-tela (CLI-26, DEC-160): a etapa 30 pede o aviso na loja fechada e cancela pelo Perfil.
const ROOT = path.resolve(__dirname, "../../..");
const ler = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");

describe("Maestro 30 — Avisar quando abrir", () => {
  const etapa = ler(".maestro/etapas/30_avisar_quando_abrir.yaml");

  it("a avulsa usa conta própria, loja própria e o profissional em Fora", () => {
    const avulsa = ler(".maestro/avulsas/30_avisar_quando_abrir.yaml");
    expect(avulsa).toMatch(/ETAPA: "30"/);
    expect(avulsa).toMatch(/CONTA: "1"/);
    expect(avulsa).toMatch(/PROF_FORA: "1"/);
    expect(avulsa).toMatch(/etapas\/30_avisar_quando_abrir\.yaml/);
  });

  it("a bateria roda a 30 por padrão", () => {
    expect(ler(".maestro/bateria.sh")).toMatch(/ETAPAS_PADRAO="[^"]*\b29 30\b[^"]*"/);
  });

  it("os ids do fluxo existem nas telas", () => {
    const telas = ler("src/components/AvisarQuandoAbrir.tsx") + ler("src/components/AvisosDeHoje.tsx");
    expect(etapa).toContain('id: "aviso-abrir-pedir"');
    expect(etapa).toContain('id: "aviso-abrir-pedido"');
    expect(etapa).toContain('id: "aviso-abrir-cancelar"');
    expect(etapa).toContain('id: "avisos-de-hoje"');
    expect(telas).toContain("`${id}-pedir`");
    expect(telas).toContain("`${id}-pedido`");
    expect(telas).toContain("`${id}-cancelar`");
    expect(telas).toContain('NOTIFY_OPEN: "aviso-abrir"');
    expect(telas).toContain('testID="avisos-de-hoje"');
    expect(telas).toContain("testID={`aviso-de-hoje-cancelar-${aviso.id}`}");
  });

  it("pede, vê o pedido, e cancela pelo Perfil, nesta ordem", () => {
    const pediu = etapa.indexOf('id: "aviso-abrir-pedir"');
    const viu = etapa.indexOf('id: "aviso-abrir-pedido"');
    const perfil = etapa.indexOf('id: "avisos-de-hoje"');
    const cancelou = etapa.indexOf('id: "aviso-de-hoje-cancelar-.*"');
    expect(pediu).toBeGreaterThan(-1);
    expect(viu).toBeGreaterThan(pediu);
    expect(perfil).toBeGreaterThan(viu);
    expect(cancelou).toBeGreaterThan(perfil);
  });
});
