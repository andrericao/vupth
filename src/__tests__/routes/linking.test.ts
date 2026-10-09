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

describe('o link para compartilhar (24/09)', () => {
  const { linkParaCompartilhar } = jest.requireActual('../../routes/linking');

  it('a loja', () => {
    expect(linkParaCompartilhar('https://vupth.pages.dev/', 'e1')).toBe('https://vupth.pages.dev/loja/e1');
  });

  it('a loja já abrindo um profissional', () => {
    expect(linkParaCompartilhar('https://vupth.pages.dev', 'e1', 'p9')).toBe('https://vupth.pages.dev/loja/e1?profissional=p9');
  });

  it('o link do profissional reabre a loja com o profissional nos parâmetros', () => {
    const estado = JSON.stringify(telaDoCaminho('/loja/e1?profissional=p9', opcoes));
    expect(estado).toContain('establishmentDetail');
    expect(estado).toContain('"profissional":"p9"');
  });

  it('as páginas legais têm URL pública (paginas-legais: a Play Store pede)', () => {
    expect(JSON.stringify(telaDoCaminho('/privacidade', opcoes))).toContain('privacy');
    expect(JSON.stringify(telaDoCaminho('/excluir-conta', opcoes))).toContain('excluirConta');
    expect(JSON.stringify(telaDoCaminho('/termos', opcoes))).toContain('terms');
  });
});
