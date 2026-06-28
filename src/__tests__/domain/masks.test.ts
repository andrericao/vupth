import { maskCEP, maskPhone, maskDate, unmask } from "@utils/masks";

describe("maskCEP", () => {
  it("formats 8 digits as 00000-000", () => {
    expect(maskCEP("01310100")).toBe("01310-100");
  });
  it("keeps partial input without dash before 6th digit", () => {
    expect(maskCEP("01310")).toBe("01310");
    expect(maskCEP("013")).toBe("013");
  });
  it("ignores non-digits and caps at 8 digits", () => {
    expect(maskCEP("0131-0100abc99")).toBe("01310-100");
  });
});

describe("maskPhone", () => {
  it("formats 11 digits (celular) as (00) 00000-0000", () => {
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
  });
  it("formats 10 digits (fixo) as (00) 0000-0000", () => {
    expect(maskPhone("1133334444")).toBe("(11) 3333-4444");
  });
  it("handles partial input", () => {
    expect(maskPhone("11")).toBe("(11");
    expect(maskPhone("119")).toBe("(11) 9");
  });
});

describe("maskDate", () => {
  it("formats 8 digits as DD/MM/AAAA", () => {
    expect(maskDate("31122026")).toBe("31/12/2026");
  });
  it("handles partial input", () => {
    expect(maskDate("31")).toBe("31");
    expect(maskDate("3112")).toBe("31/12");
  });
});

describe("unmask", () => {
  it("strips non-digits", () => {
    expect(unmask("01310-100")).toBe("01310100");
    expect(unmask("(11) 98765-4321")).toBe("11987654321");
  });
});
