import { readFileSync } from 'fs';
import { join } from 'path';

// Andre, 18/09: "tocar na aba JÁ ATIVA não volta ao topo da lista" — na Home e
// em Atendimentos. É o gesto que todo app de lista tem, e o caminho natural de
// quem desceu demais.
//
// O comportamento combinado com o partner: sobe com animação e, se já estiver
// no topo, não faz nada. É exatamente o que o `useScrollToTop` do React
// Navigation faz — por isso a guarda é estática: o que quebra aqui é alguém
// trocar a lista de lugar e esquecer a `ref`.

const tela = (nome: string) =>
  readFileSync(join(__dirname, `../../screens/${nome}.tsx`), 'utf-8');

describe.each([
  ['Home', 'FlatList'],
  ['Attendances', 'ScrollView'],
])('%s — tocar na aba ativa volta ao topo', (nome, container) => {
  const fonte = tela(nome);

  it('usa o useScrollToTop do React Navigation', () => {
    expect(fonte).toMatch(/useScrollToTop\(/);
    expect(fonte).toMatch(/from "@react-navigation\/native"/);
  });

  it('e a referência está LIGADA no container que rola', () => {
    const ref = fonte.match(/const (\w+) = useRef</)?.[1];
    expect(ref).toBeTruthy();
    // A `ref` tem de chegar ao container — sem isso o hook não tem o que rolar.
    const trecho = new RegExp(`<${container}[\\s\\S]{0,120}ref=\\{${ref}\\}`);
    expect(fonte).toMatch(trecho);
  });
});
