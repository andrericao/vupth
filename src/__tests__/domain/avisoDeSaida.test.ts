import { avisoDeSaida } from '../../domain/queue/avisoDeSaida';
import { pesoDoBotao } from '../../domain/pesoDoBotao';

// Decisão D10 (Andre, 17/09): com multa, o aviso de saída diz por que ela
// existe e oferece a troca de lugar — sem multa — antes de "sair mesmo assim".

const acoes = (a: ReturnType<typeof avisoDeSaida>) => a.botoes.map((b) => b.acao);

describe('avisoDeSaida', () => {
  it('sem multa: só confirma', () => {
    const a = avisoDeSaida({ multa: false, podeTrocar: true });
    expect(a.mensagem).toBe('Tem certeza que deseja sair da fila?');
    expect(acoes(a)).toEqual(['ficar', 'sair']);
    expect(a.mensagem).not.toMatch(/multa/);
  });

  it('com multa: diz o PORQUÊ — o próximo cliente é chamado antes do previsto', () => {
    const a = avisoDeSaida({ multa: true, podeTrocar: true });
    expect(a.mensagem).toMatch(/próximo cliente é chamado antes do previsto/);
    expect(a.mensagem).toMatch(/multa de R\$ 3,00 no seu próximo atendimento/);
  });

  it('com multa e troca disponível: oferece trocar de lugar ANTES de sair', () => {
    const a = avisoDeSaida({ multa: true, podeTrocar: true });
    expect(acoes(a)).toEqual(['ficar', 'trocar', 'sair']);
    expect(a.mensagem).toMatch(/Trocar de lugar .* não tem multa/);
    expect(a.botoes.find((b) => b.acao === 'sair')?.texto).toBe('Sair mesmo assim');
  });

  it('só a TROCA é oferecida como saída sem multa — ir para o fim e remarcar também têm multa', () => {
    const a = avisoDeSaida({ multa: true, podeTrocar: true });
    expect(a.mensagem).not.toMatch(/Mudar minha vez|ir para o fim|remarcar/i);
  });

  it('sem a troca disponível, não a oferece', () => {
    const a = avisoDeSaida({ multa: true, podeTrocar: false });
    expect(acoes(a)).toEqual(['ficar', 'sair']);
    expect(a.mensagem).not.toMatch(/Trocar de lugar/);
  });

  it('usa o valor informado (quando o backend passar a mandar o escalonado)', () => {
    const a = avisoDeSaida({ multa: true, podeTrocar: false, valor: 5 });
    expect(a.mensagem).toMatch(/multa de R\$ 5,00/);
  });

  it('a hierarquia visual põe o peso em FICAR — a saída segura', () => {
    const a = avisoDeSaida({ multa: true, podeTrocar: true });
    const botoes = a.botoes.map((b) => ({ estilo: b.estilo }));
    expect(botoes.map((_, i) => pesoDoBotao(botoes, i))).toEqual(['solido', 'vazado', 'vazado-perigo']);
  });
});

// Entrar por aceite de pedido de corte (ou reconciliar a fila na abertura) deixa
// o app sem previsão por alguns segundos — e com o profissional em ALMOÇO foi
// assim que a tela disse "agora" (Andre, 17/09). Aqui o aviso não afirma o que
// não sabe: nem cobra o que talvez não seja devido, nem promete grátis.
describe('avisoDeSaida — sem previsão ainda', () => {
  it('diz a CONDIÇÃO da multa, em vez de afirmar que há ou que não há', () => {
    const a = avisoDeSaida({ multa: false, podeTrocar: true, semPrevisao: true });
    expect(a.mensagem).toMatch(/Ainda estamos calculando/);
    expect(a.mensagem).toMatch(/Se faltar menos de 1 hora.*multa de R\$ 3,00/);
    expect(acoes(a)).toEqual(['ficar', 'trocar', 'sair']);
  });

  it('sem a troca disponível, não a oferece', () => {
    const a = avisoDeSaida({ multa: false, podeTrocar: false, semPrevisao: true });
    expect(acoes(a)).toEqual(['ficar', 'sair']);
    expect(a.mensagem).not.toMatch(/Trocar de lugar/);
  });

  it('a hierarquia continua pondo o peso em FICAR', () => {
    const a = avisoDeSaida({ multa: false, podeTrocar: true, semPrevisao: true });
    const botoes = a.botoes.map((b) => ({ estilo: b.estilo }));
    expect(botoes.map((_, i) => pesoDoBotao(botoes, i))).toEqual(['solido', 'vazado', 'vazado-perigo']);
  });
});
