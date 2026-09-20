import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Feedback de device (Andre 2026-08-07): "em algumas telas (principalmente nas
// configuracoes) o scroll nao esta funcionando".
//
// Quatro telas (Settings, Profile — depois removida —, EditEmail e
// EditPassword) eram um `VStack
// flex={1}` seco: o conteudo que passasse da altura da tela simplesmente ficava
// inalcancavel, sem nenhum sinal de erro. Nas Configuracoes ficou obvio porque o
// painel de diagnostico do WS aumentou a altura, mas as outras tres ja estavam
// assim havia tempo.
//
// Montar cada tela aqui exigiria mockar navegacao, servicos e nativos — caro e
// fragil. Esta varredura estatica custa milissegundos e pega exatamente o erro
// que aconteceu: tela nova (ou tela que cresceu) sem container rolavel.

const SCREENS_DIR = join(__dirname, '../../screens');

// Telas cujo conteudo é uma lista virtualizada ou cabe sempre: a rolagem vem do
// proprio `FlatList`. Manter esta lista CURTA e justificada.
const SEM_SCROLL_PROPRIO = new Set<string>([]);

function temContainerRolavel(fonte: string): boolean {
  // `SectionList` entrou em 20/09 com as secoes "Trabalhando"/"Fora" na tela da
  // loja: e a mesma lista virtualizada do `FlatList`, com cabecalho por secao.
  // Faltava aqui, e a tela reprovou por usar a ferramenta certa.
  return (
    /<ScrollView[\s>]/.test(fonte) ||
    /<FlatList[\s>]/.test(fonte) ||
    /<SectionList[\s>]/.test(fonte)
  );
}

describe('toda tela precisa rolar', () => {
  const arquivos = readdirSync(SCREENS_DIR).filter((f) => f.endsWith('.tsx'));

  it('encontra as telas do projeto', () => {
    expect(arquivos.length).toBeGreaterThan(10);
  });

  it.each(arquivos)('%s tem ScrollView ou FlatList', (arquivo) => {
    if (SEM_SCROLL_PROPRIO.has(arquivo)) return;
    const fonte = readFileSync(join(SCREENS_DIR, arquivo), 'utf-8');

    expect(temContainerRolavel(fonte)).toBe(true);
  });
});

// Feedback de device (Andre 2026-09-09): "não quero essa página colada, ela
// deve rolar junto com a página".
//
// Ter `FlatList` na tela nao basta — a Home TINHA uma, e mesmo assim so os
// estabelecimentos rolavam. Saudacao, busca, card da fila e "Recentes" ficavam
// FORA dela: a tela parecia presa, com uma janelinha rolando no meio.
//
// A varredura acima nao pegaria isso, porque a lista existia. Esta pega: na
// Home, o conteudo do topo precisa viajar DENTRO da lista.
describe('a Home rola inteira, nao so a lista', () => {
  const fonte = readFileSync(join(SCREENS_DIR, 'Home.tsx'), 'utf8');

  it('o conteudo do topo viaja no cabecalho da lista', () => {
    expect(fonte).toMatch(/ListHeaderComponent=/);
  });

  it('a saudacao e o "Recentes" NAO ficam fora da lista', () => {
    // Tudo que vem antes do `<FlatList` no return e conteudo fixo por
    // definicao. Comentarios saem antes da checagem — o texto que EXPLICA a
    // regra citava "Recentes" e reprovava o proprio arquivo.
    // `lastIndexOf` ANTES da lista: o arquivo tem subcomponentes com `return`
    // proprio, e o primeiro deles nao e o da tela.
    const daLista = fonte.indexOf('<FlatList');
    const corpo = fonte
      .slice(fonte.lastIndexOf('return (', daLista), daLista)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(corpo).not.toMatch(/<ScreenHeader/);
    expect(corpo).not.toMatch(/Recentes/);
  });
});
