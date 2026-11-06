import { useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";

import { Campanha } from "@services/campaignService";
import { CartaoTicket } from "@components/CartaoTicket";
import { CartaoDeCampanha } from "@components/CartaoDeCampanha";

/** Um slide que não é campanha: um aviso no mesmo card (ex.: "Opções · clique em Opções caso não consiga chegar"). */
export type SlideDeAviso = { id: string; valor: string; nome: string; detalhe?: string };

type Props = { campanhas: Campanha[]; avisos?: SlideDeAviso[] };

// Bloco da Home que so existe quando ha campanha criada no Painel; com mais de
// uma, rola de lado. O titulo e o nome que o Andre da a campanha. O toque abre
// os detalhes (o card e o CartaoDeCampanha). promocoes-em-secoes (05/11): a campanha em que a pessoa ja
// participa nao vem (useCampanhasAtivas).
// ticket-picote-so-na-esquerda (André, 24/10): vão de 12 px entre os cards; o picote (só à esquerda) não bate no vizinho.
const ESPACO_ENTRE_CARDS = 12;

export function CarrosselDeCampanhas({ campanhas, avisos = [] }: Props) {
  const { width } = useWindowDimensions();
  // Quem acabou de tocar em Participar ja esta dentro: a campanha sai do carrossel na hora.
  const [entrou, setEntrou] = useState<string[]>([]);
  const visiveis = campanhas.filter((c) => !entrou.includes(c.id));
  const total = visiveis.length + avisos.length;
  if (total === 0) return null;
  const unica = total === 1;
  const largura = unica ? width - 32 : Math.max(width - 64, 220);

  return (
    <ScrollView
      horizontal
      // O ScrollView horizontal vem com flexGrow 1: dentro de uma tela que cresce na vertical (Aguardando) ele
      // esticava e empurrava os dados para o rodape, deixando meia tela de vao (prints do André, 31/10).
      style={{ flexGrow: 0 }}
      showsHorizontalScrollIndicator={false}
      snapToInterval={unica ? undefined : largura + ESPACO_ENTRE_CARDS}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, gap: ESPACO_ENTRE_CARDS }}
      testID="campanhas-da-home"
    >
      {visiveis.map((c) => (
        <CartaoDeCampanha key={c.id} campanha={c} largura={largura} aoParticipar={() => setEntrou((ids) => [...ids, c.id])} />
      ))}
      {avisos.map((a) => (
        <CartaoTicket key={a.id} testID={`aviso-${a.id}`} largura={largura} valor={a.valor} nome={a.nome} detalhe={a.detalhe} />
      ))}
    </ScrollView>
  );
}
