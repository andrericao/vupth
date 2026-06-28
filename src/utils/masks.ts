// Máscaras de formatação para inputs. Funções puras (testáveis) que recebem o
// texto digitado e devolvem o valor formatado. Use no onChangeText.
// Portado do front-partner (src/lib/masks.ts) para manter os dois apps alinhados.

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** 00000-000 */
export function maskCEP(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** (00) 00000-0000 ou (00) 0000-0000 */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length < 3) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** DD/MM/AAAA */
export function maskDate(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Remove a máscara, deixando só dígitos (para enviar ao backend). */
export function unmask(value: string): string {
  return onlyDigits(value);
}
