import {
  SERVICE_TYPE_LABELS,
  serviceTypeLabel,
  formatSpecialty,
} from '@domain/establishment/serviceType';

// Andre no device (2026-08-06): "na tela inicial aparece o tipo de
// estabelecimento, barbearia, salão etc, mas quando clicamos no estabelecimento
// o tipo dele fica em inglês, quero que fique em português mesmo".
//
// A causa: o mapa de rótulos vivia DENTRO da Home, então só a Home traduzia. E
// `specialty` é texto livre no backend ("Corte masculino", "Colorista"), mas
// parte dos cadastros veio preenchida com a categoria em inglês.

describe('serviceTypeLabel', () => {
  it('traduz todas as categorias conhecidas', () => {
    expect(serviceTypeLabel('BARBER')).toBe('Barbearia');
    expect(serviceTypeLabel('BEAUTY_SALON')).toBe('Salão');
    expect(serviceTypeLabel('EYEBROW')).toBe('Sobrancelha');
    expect(serviceTypeLabel('NAIL_SALON')).toBe('Manicure');
    expect(serviceTypeLabel('SPA')).toBe('Spa');
    expect(serviceTypeLabel('CLINIC')).toBe('Clínica');
  });

  it('não deixa categoria nenhuma sem rótulo', () => {
    for (const [chave, rotulo] of Object.entries(SERVICE_TYPE_LABELS)) {
      expect(rotulo).toBeTruthy();
      expect(rotulo).not.toBe(chave);
    }
  });

  it('aceita a categoria em minúscula ou com espaço sobrando', () => {
    expect(serviceTypeLabel(' barber ')).toBe('Barbearia');
    expect(serviceTypeLabel('Beauty_Salon')).toBe('Salão');
  });

  it('valor desconhecido volta INTACTO — nunca some da tela', () => {
    expect(serviceTypeLabel('TATTOO')).toBe('TATTOO');
  });
});

describe('formatSpecialty', () => {
  it('traduz a especialidade que veio como categoria em inglês', () => {
    // Era exatamente isto que aparecia embaixo do nome do profissional.
    expect(formatSpecialty('BARBER')).toBe('Barbearia');
    expect(formatSpecialty('NAIL_SALON')).toBe('Manicure');
  });

  it('PRESERVA quem escreveu a especialidade de verdade', () => {
    // `specialty` é texto livre no backend: mapear à força apagaria o dado bom.
    expect(formatSpecialty('Corte masculino')).toBe('Corte masculino');
    expect(formatSpecialty('Colorista')).toBe('Colorista');
  });

  it('trata lista separada por vírgula, misturando os dois casos', () => {
    expect(formatSpecialty('BARBER, Colorista')).toBe('Barbearia, Colorista');
  });

  it('vazio, nulo e indefinido viram string vazia (não "undefined" na tela)', () => {
    expect(formatSpecialty('')).toBe('');
    expect(formatSpecialty(null)).toBe('');
    expect(formatSpecialty(undefined)).toBe('');
  });
});
