import { shouldExitOnBack } from "@hooks/useDoubleBackExit";

describe("shouldExitOnBack", () => {
  it("não sai no primeiro voltar (sem toque anterior)", () => {
    expect(shouldExitOnBack(null, 1000)).toBe(false);
  });

  it("sai quando o segundo voltar vem dentro da janela (2s)", () => {
    expect(shouldExitOnBack(1000, 1500)).toBe(true);
    expect(shouldExitOnBack(1000, 3000)).toBe(true); // exatamente no limite
  });

  it("NÃO sai quando o segundo voltar vem depois da janela", () => {
    expect(shouldExitOnBack(1000, 3001)).toBe(false);
  });

  it("respeita janela customizada", () => {
    expect(shouldExitOnBack(1000, 1400, 500)).toBe(true);
    expect(shouldExitOnBack(1000, 1600, 500)).toBe(false);
  });
});
