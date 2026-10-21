import { Text, View } from "react-native";
import { CircleDollarSign, CircleX, Info, TriangleAlert, type LucideIcon } from "lucide-react-native";

import { aparenciaDoTipo, type TipoDeDialogo } from "@domain/tipoDeDialogo";
import { useTema } from "@hooks/useTema";
import { fs } from "@stores/fonteStore";

// A faixa de 6 px e o selo com icone de um cartao com tipo, para quem tem cartao
// proprio e nao passa pelo `DialogoVupth` (o aviso de pagamento pendente e um modal
// da propria tela, com o seu botao Pagar). E o mesmo desenho do dialogo: o tipo e
// dito por uma faixa que se ve e por um selo, nunca pela cor do botao.
const ICONES: Record<TipoDeDialogo, LucideIcon> = {
  informacao: Info,
  atencao: TriangleAlert,
  dinheiro: CircleDollarSign,
  erro: CircleX,
};

export function FaixaESelo({ tipo, selo }: { tipo: TipoDeDialogo; selo?: string }) {
  const { tema } = useTema();
  const aparencia = aparenciaDoTipo(tipo, selo, tema);
  const Icone = ICONES[tipo];
  return (
    <View>
      {aparencia.faixa ? (
        <View
          testID="faixa-do-tipo"
          style={{ height: 6, borderRadius: 999, backgroundColor: aparencia.corDaFaixa ?? aparencia.fundo, marginBottom: 12 }}
        />
      ) : null}
      <View
        testID="selo-do-tipo"
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: aparencia.fundo,
          borderRadius: 999,
          paddingVertical: 3,
          paddingHorizontal: 9,
        }}
      >
        <Icone size={16} color={aparencia.texto} />
        <Text style={{ color: aparencia.texto, fontSize: fs(12), fontWeight: "700" }}>{aparencia.selo}</Text>
      </View>
    </View>
  );
}
