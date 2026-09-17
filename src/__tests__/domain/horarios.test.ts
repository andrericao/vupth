import {
  textoDaFaixa,
  semanaParaExibir,
  horarioDeHoje,
  resumoDeHoje,
  proximaAbertura,
  diaDaData,
  dataISO,
  HorariosDaLoja,
} from '../../domain/establishment/horarios';

// C22: a tela da loja passa a exibir a SEMANA. Até 17/09 o contrato só tinha um
// booleano, e quem chegava fora do horário não sabia quando a loja reabre.
// Contrato do backend de 16/09 (GET /establishment/{id}/hours).

const QUINTA = new Date(2026, 8, 17, 10, 0); // 17/09/2026, uma quinta

const semana: HorariosDaLoja = {
  configured: true,
  weekly: [
    { day: 'MONDAY', closed: false, opens: '08:00', closes: '18:00' },
    { day: 'TUESDAY', closed: false, opens: '08:00', closes: '18:00' },
    { day: 'WEDNESDAY', closed: false, opens: '08:00', closes: '18:00' },
    { day: 'THURSDAY', closed: false, opens: '08:00', closes: '18:00' },
    { day: 'FRIDAY', closed: false, opens: '08:00', closes: '20:00' },
    { day: 'SATURDAY', closed: false, opens: '08:00', closes: '12:00' },
    { day: 'SUNDAY', closed: true },
  ],
  exceptions: [],
  upcoming: [
    { date: '2026-09-17', day: 'THURSDAY', closed: false, opens: '08:00', closes: '18:00', exception: false },
    { date: '2026-09-18', day: 'FRIDAY', closed: false, opens: '08:00', closes: '20:00', exception: false },
  ],
};

describe('textoDaFaixa — as três formas do contrato', () => {
  it('fechado não leva horário', () => {
    expect(textoDaFaixa({ closed: true })).toBe('Fechado');
    expect(textoDaFaixa({ closed: false, opens: null, closes: null })).toBe('Fechado');
  });

  it('abre igual a fecha é 24 horas', () => {
    expect(textoDaFaixa({ closed: false, opens: '00:00', closes: '00:00' })).toBe('24 horas');
  });

  it('fecha antes de abrir vira o dia — e a tela DIZ isso', () => {
    expect(textoDaFaixa({ closed: false, opens: '22:00', closes: '02:00' })).toBe(
      '22:00 às 02:00 (vira o dia)',
    );
  });

  it('o caso comum', () => {
    expect(textoDaFaixa({ closed: false, opens: '08:00', closes: '18:00' })).toBe('08:00 às 18:00');
  });
});

describe('a semana na tela', () => {
  it('sai na ordem segunda→domingo, com o dia de hoje marcado', () => {
    const linhas = semanaParaExibir(semana, QUINTA);
    expect(linhas.map((l) => l.nome)).toEqual([
      'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo',
    ]);
    expect(linhas.filter((l) => l.ehHoje).map((l) => l.nome)).toEqual(['Quinta']);
    expect(linhas[6].texto).toBe('Fechado');
  });

  it('loja que ainda não definiu a semana não vira grade inventada', () => {
    const linhas = semanaParaExibir({ configured: false, weekly: [], exceptions: [], upcoming: [] }, QUINTA);
    expect(linhas).toEqual([]);
    expect(resumoDeHoje({ configured: false, weekly: [], exceptions: [], upcoming: [] }, QUINTA)).toBeNull();
  });

  it('domingo é o dia 0 do JS, mas o último da semana do contrato', () => {
    expect(diaDaData(new Date(2026, 8, 20))).toBe('SUNDAY');
    expect(diaDaData(new Date(2026, 8, 21))).toBe('MONDAY');
    expect(dataISO(new Date(2026, 8, 7))).toBe('2026-09-07');
  });
});

describe('o dia de hoje', () => {
  it('resume o horário de hoje', () => {
    expect(resumoDeHoje(semana, QUINTA)).toBe('Hoje, 08:00 às 18:00');
  });

  it('a EXCEÇÃO da data ganha da regra da semana', () => {
    const comExcecao: HorariosDaLoja = {
      ...semana,
      exceptions: [{ date: '2026-09-17', closed: false, opens: '10:00', closes: '14:00' }],
      upcoming: [],
    };
    expect(horarioDeHoje(comExcecao, QUINTA)?.exception).toBe(true);
    expect(resumoDeHoje(comExcecao, QUINTA)).toBe('Hoje, 10:00 às 14:00');
  });

  it('dia fechado por exceção', () => {
    const feriado: HorariosDaLoja = { ...semana, exceptions: [{ date: '2026-09-17', closed: true }], upcoming: [] };
    expect(resumoDeHoje(feriado, QUINTA)).toBe('Fechada hoje');
  });
});

describe('quando reabre — o que quem chega fora do horário quer saber', () => {
  it('amanhã tem nome próprio', () => {
    expect(proximaAbertura(semana, QUINTA)).toBe('Reabre amanhã, 08:00');
  });

  it('pula os dias fechados e usa o dia da semana', () => {
    const fds: HorariosDaLoja = {
      ...semana,
      upcoming: [
        { date: '2026-09-17', day: 'THURSDAY', closed: true },
        { date: '2026-09-18', day: 'FRIDAY', closed: true },
        { date: '2026-09-19', day: 'SATURDAY', closed: false, opens: '09:00', closes: '12:00' },
      ],
    };
    expect(proximaAbertura(fds, QUINTA)).toBe('Reabre sábado, 09:00');
  });

  it('só olha os dias JÁ RESOLVIDOS — senão promete um sábado que a exceção fechou', () => {
    const sabadoFechadoPorExcecao: HorariosDaLoja = {
      ...semana,
      exceptions: [{ date: '2026-09-19', closed: true }],
      upcoming: [
        { date: '2026-09-18', day: 'FRIDAY', closed: true },
        { date: '2026-09-19', day: 'SATURDAY', closed: true, exception: true },
      ],
    };
    expect(proximaAbertura(sabadoFechadoPorExcecao, QUINTA)).toBeNull();
  });
});
