import { caminhoDaTela, telaDoCaminho, linkingWeb } from '../../routes/linking';

// Teste do Andre de 25/09: no navegador, em Dados pessoais, o voltar do
// celular FECHOU o app. A navegacao nao entrava no historico do navegador.

const opcoes = linkingWeb.config as never;

describe('linking da web', () => {
  it('Dados pessoais tem caminho próprio — é o que cria a entrada no histórico', () => {
    const estado = {
      routes: [{ name: 'settingsTab', state: { routes: [{ name: 'settings' }, { name: 'editProfile' }], index: 1 } }],
      index: 0,
    };
    expect(caminhoDaTela(estado as never, opcoes)).toBe('/perfil/dados');
  });

  it('parâmetro não vai para a barra de endereço', () => {
    const estado = {
      routes: [
        {
          name: 'homeTab',
          state: {
            routes: [
              { name: 'home' },
              { name: 'queueStatus', params: { professionalId: 'p1', serviceItemIds: ['s1'] } },
            ],
            index: 1,
          },
        },
      ],
      index: 0,
    };
    expect(caminhoDaTela(estado as never, opcoes)).toBe('/fila');
  });

  it('a loja reabre pela URL — o id está no caminho', () => {
    const estado = telaDoCaminho('/loja/e1', opcoes);
    expect(JSON.stringify(estado)).toContain('establishmentDetail');
    expect(JSON.stringify(estado)).toContain('e1');
  });

  it('fila, serviços e completar cadastro NÃO reabrem pela URL — sem os parâmetros, a fila poderia criar atendimento de novo', () => {
    expect(telaDoCaminho('/fila', opcoes)).toBeUndefined();
    expect(telaDoCaminho('/servicos', opcoes)).toBeUndefined();
    expect(telaDoCaminho('/completar-cadastro', opcoes)).toBeUndefined();
  });

  it('as telas do perfil reabrem', () => {
    expect(JSON.stringify(telaDoCaminho('/perfil/dados', opcoes))).toContain('editProfile');
  });
});
