import { serviceTypeTitle } from '@domain/establishment/serviceType';
import { freeIntervals, computeAvailableSlots } from '@domain/schedule/slots';
import { parseConnectHeaders, channelVerdict, shouldReconnectOnForeground, formatSince } from '@domain/ws/diagnostics';
import { lookupCep, buscarCepPorEndereco } from '@utils/cep';

// cobertura-98: as bordas das funções puras que os testes de fluxo não pegam.

const MIN = 60_000;

describe('serviceTypeTitle', () => {
  it('sem categoria, "ALL" ou desconhecida: Estabelecimentos', () => {
    expect(serviceTypeTitle(null)).toBe('Estabelecimentos');
    expect(serviceTypeTitle(undefined)).toBe('Estabelecimentos');
    expect(serviceTypeTitle('ALL')).toBe('Estabelecimentos');
    expect(serviceTypeTitle('XYZ')).toBe('Estabelecimentos');
  });

  it('categoria conhecida: o plural dela', () => {
    expect(serviceTypeTitle('SPA')).toBe('Spas');
  });
});

describe('freeIntervals / computeAvailableSlots', () => {
  it('fechamento antes do piso: nenhum vão', () => {
    expect(freeIntervals(100, 100, [])).toEqual([]);
  });

  it('bloco antes do piso é ignorado; bloco que passa do fechamento encerra', () => {
    const blocos = [
      { startMs: 0, durationMinutes: 1 },
      { startMs: 10 * MIN, durationMinutes: 60 },
    ];
    expect(freeIntervals(5 * MIN, 30 * MIN, blocos)).toEqual([[5 * MIN, 10 * MIN]]);
  });

  it('bloco começando no piso: o vão vem depois dele', () => {
    expect(freeIntervals(0, 60 * MIN, [{ startMs: 0, durationMinutes: 30 }])).toEqual([[30 * MIN, 60 * MIN]]);
  });

  it('serviço ou passo sem duração: sem horários', () => {
    const base = { floorMs: 0, closingMs: 60 * MIN, blocks: [] };
    expect(computeAvailableSlots({ ...base, serviceMinutes: 0 })).toEqual([]);
    expect(computeAvailableSlots({ ...base, serviceMinutes: 30, stepMinutes: 0 })).toEqual([]);
  });
});

describe('diagnóstico do WebSocket', () => {
  it('sem cabeçalhos: anônimo, sem heartbeat', () => {
    expect(parseConnectHeaders(null)).toEqual({
      heartBeat: null, serverSendsMs: 0, serverExpectsMs: 0, userName: null, authenticated: false,
    });
    expect(parseConnectHeaders({ 'heart-beat': 'x,y', 'user-name': '  ' }).serverSendsMs).toBe(0);
  });

  it('cada estado vira uma frase', () => {
    const ok = parseConnectHeaders({ 'heart-beat': '10000,10000', 'user-name': 'ana' });
    expect(channelVerdict('personal', 'idle', null).level).toBe('idle');
    expect(channelVerdict('personal', 'connecting', null).message).toBe('Conectando...');
    expect(channelVerdict('personal', 'error', null).level).toBe('bad');
    expect(channelVerdict('personal', 'connected', null).level).toBe('warn');
    expect(channelVerdict('personal', 'connected', parseConnectHeaders({})).level).toBe('bad');
    expect(channelVerdict('public', 'connected', parseConnectHeaders({ 'heart-beat': '0,0' })).level).toBe('warn');
    expect(channelVerdict('personal', 'connected', ok).message).toBe('Conectado como ana, heartbeat de 10s');
    expect(channelVerdict('public', 'connected', parseConnectHeaders({ 'heart-beat': '5000,0' })).message).toBe(
      'Conectado, heartbeat de 5s',
    );
  });

  it('reconecta só ao voltar para a frente desconectado', () => {
    expect(shouldReconnectOnForeground('active', false)).toBe(true);
    expect(shouldReconnectOnForeground('active', true)).toBe(false);
    expect(shouldReconnectOnForeground('background', false)).toBe(false);
  });

  it('formatSince: nunca, segundos, minutos e horas', () => {
    expect(formatSince(null)).toBe('nunca');
    expect(formatSince(0, 12_000)).toBe('há 12s');
    expect(formatSince(0, 3 * MIN)).toBe('há 3min');
    expect(formatSince(0, 120 * MIN)).toBe('há 2h');
    expect(formatSince(5000, 0)).toBe('há 0s');
  });
});

describe('CEP (ViaCEP)', () => {
  const fetchOriginal = global.fetch;
  const resposta = (ok: boolean, corpo: unknown) =>
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok, json: async () => corpo });

  beforeEach(() => {
    global.fetch = jest.fn() as never;
  });
  afterAll(() => {
    global.fetch = fetchOriginal;
  });

  it('lookupCep: campos ausentes viram vazio; erro, resposta ruim ou rede caída: null', async () => {
    resposta(true, {});
    expect(await lookupCep('88000-000')).toEqual({ street: '', neighborhood: '', city: '', state: '' });
    resposta(false, {});
    expect(await lookupCep('88000000')).toBeNull();
    resposta(true, { erro: true });
    expect(await lookupCep('88000000')).toBeNull();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('rede'));
    expect(await lookupCep('88000000')).toBeNull();
    expect(await lookupCep('123')).toBeNull();
  });

  const endereco = { street: 'Rua das Flores', city: 'Florianópolis', state: 'Santa Catarina' };

  it('buscarCepPorEndereco: sem UF, cidade ou rua curtas: null sem buscar', async () => {
    expect(await buscarCepPorEndereco({ ...endereco, state: undefined })).toBeNull();
    expect(await buscarCepPorEndereco({ ...endereco, state: 'Narnia' })).toBeNull();
    expect(await buscarCepPorEndereco({ ...endereco, city: 'Fl' })).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('buscarCepPorEndereco: resposta ruim, sem lista ou rede caída: null', async () => {
    resposta(false, []);
    expect(await buscarCepPorEndereco(endereco)).toBeNull();
    resposta(true, { erro: true });
    expect(await buscarCepPorEndereco(endereco)).toBeNull();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('rede'));
    expect(await buscarCepPorEndereco(endereco)).toBeNull();
  });

  it('buscarCepPorEndereco: o bairro desempata; sem bairro na resposta, vale a lista toda', async () => {
    resposta(true, [
      { cep: '88010-000', bairro: 'Centro' },
      { cep: '88020-000' },
    ]);
    expect(await buscarCepPorEndereco({ ...endereco, neighborhood: 'centro' })).toBe('88010000');
    resposta(true, [{ cep: '88010-000' }, { cep: '88020-000', bairro: 'Trindade' }]);
    expect(await buscarCepPorEndereco({ ...endereco, neighborhood: 'Centro' })).toBeNull();
  });

  it('buscarCepPorEndereco: um CEP só, mas incompleto: null', async () => {
    resposta(true, [{ cep: '880' }]);
    expect(await buscarCepPorEndereco(endereco)).toBeNull();
  });
});
