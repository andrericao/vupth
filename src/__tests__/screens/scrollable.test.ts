import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Feedback de device (Andre 2026-08-07): "em algumas telas (principalmente nas
// configuracoes) o scroll nao esta funcionando".
//
// Quatro telas (Settings, Profile, EditEmail, EditPassword) eram um `VStack
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
  return /<ScrollView[\s>]/.test(fonte) || /<FlatList[\s>]/.test(fonte);
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
