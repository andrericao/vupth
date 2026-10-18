import { Animated, Modal, View, Text, Pressable, ScrollView, BackHandler, StyleSheet } from "react-native";
import { CircleDollarSign, CircleX, Info, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { useEffect } from "react";

import { useDialogoStore, type DialogoNaTela } from "@stores/dialogo.store";
import { pesoDoBotao } from "@domain/pesoDoBotao";
import {
  TOKENS_CLARO,
  aparenciaDoTipo,
  ordemDosBotoes,
  papelDoBotao,
  type PapelDoBotao,
  type TipoDeDialogo,
} from "@domain/tipoDeDialogo";
import { useAnimacaoDoDialogo } from "@hooks/useAnimacaoDoDialogo";
import { fs } from "@stores/fonteStore";

// O diálogo do app — a mesma caixa nas duas plataformas e nos dois apps.
//
// 🔴 "o modal de aviso na versão web tá melhor que o modal do apk" (Andre,
// 08/09). O `Alert` nativo é do sistema operacional: não aceita fonte, cor nem
// raio. Seguir o desenho exigia trocá-lo por um modal nosso.
//
// ⚠️ OS VALORES VÊM DO ARQUIVO DE DESIGN, não de dedução. A primeira versão foi
// montada inferindo dos tokens e chegou perto, mas errou cinco coisas — e a
// última invertia a hierarquia. Lidos nos quatro `MODAL ·` desenhados:
//
//   fundo #16330073 (forest 45%, NÃO preto) .... os quatro
//   respiro lateral 24 ......................... os quatro
//   card raio 20, padding 22, gap 16 ........... três de quatro
//   título Archivo 18/800, ls −0,4 ............. três de três
//   corpo Inter, text-secondary ................ 12 a 14 conforme o modal
//   botões empilhados, largura cheia ........... os quatro
//   borda do vazado: 1,5 ....................... Button/Outline
//
// A HIERARQUIA mora no `pesoDoBotao`, não aqui: o sólido é a saída segura
// quando há ação sem volta na caixa. Ver o porquê lá.
//
// ⚠️ Altura MÍNIMA, não cravada: com a fonte do sistema ampliada, caixa travada
// corta o rótulo (DS4).
//
// Um só na árvore. Ele avisa a store que existe — sem isso, quem chama cai no
// Alert do sistema em vez de ficar mudo.
//
// COM `tipo` (design-modais, 17/10) o cartão ganha a identidade do tipo — faixa
// de 6 px no topo e selo com ícone — e a hierarquia dos botões do desenho novo:
// o primário é sempre brandGreen + forest, e só a ação destrutiva é danger. SEM
// `tipo` é o cartão de antes, número por número.
//
// A entrada e a saída são animadas por dentro, com o `Modal` em
// `animationType="none"`: o diálogo fica montado até a saída acabar (ver
// `useAnimacaoDoDialogo`).
const FOREST = "#163300";
const BRAND_GREEN = "#9FE870";
const DANGER = "#B3261E";
const TEXT_SECONDARY = "#454745";

const ICONES: Record<TipoDeDialogo, LucideIcon> = {
  informacao: Info,
  atencao: TriangleAlert,
  dinheiro: CircleDollarSign,
  erro: CircleX,
};

// Véu do desenho novo (tokens.json, primitivas.modal.veuClaro). O sem-tipo
// continua com o forest a 45% do desenho antigo.
const VEU_DO_TIPO = "rgba(22,51,0,.35)";
const VEU_SEM_TIPO = "#16330073";

type EstiloDaFaixa = ReturnType<typeof useAnimacaoDoDialogo>["estiloDaFaixa"];

type Cartao = {
  atual: DialogoNaTela;
  responder: (i: number) => void;
};

export function DialogoVupth() {
  const atual = useDialogoStore((s) => s.atual);
  const responder = useDialogoStore((s) => s.responder);
  const marcarHost = useDialogoStore((s) => s.marcarHost);

  useEffect(() => {
    marcarHost(true);
    return () => marcarHost(false);
  }, [marcarHost]);

  // `mostrado` continua o último pedido enquanto a saída anima, mesmo com a
  // loja já vazia.
  const { mostrado, estiloDoVeu, estiloDoCartao, estiloDaFaixa } = useAnimacaoDoDialogo(atual);

  const indiceCancelar = atual ? atual.botoes.findIndex((b) => b.estilo === "cancel") : -1;

  // O voltar do Android com um diálogo na tela. Teste de 25/09: num aviso só
  // com "OK", o voltar levou a TELA de volta e o diálogo ficou por cima. Então,
  // enquanto houver diálogo, o voltar é dele — responde como cancelar (ou o
  // primeiro botão) e NUNCA chega à navegação. Com `cancelavel: false`, é
  // consumido e não faz nada: só um botão responde.
  useEffect(() => {
    if (!atual) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (atual.cancelavel) responder(indiceCancelar >= 0 ? indiceCancelar : 0);
      return true;
    });
    return () => sub.remove();
  }, [atual, indiceCancelar, responder]);

  if (!mostrado) return null;

  // Durante a saída o cartão ainda esta na tela mostrando os botoes do pedido
  // que acabou de responder. Um 2o toque nele chamaria `responder` e, se houver
  // outro aviso na fila, o responderia por engano.
  const interativo = mostrado === atual;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      // Voltar (Android) equivale ao cancelar; sem ele, o único jeito de sair de
      // um aviso seria acertar o botão.
      onRequestClose={() => {
        if (atual?.cancelavel) responder(indiceCancelar >= 0 ? indiceCancelar : 0);
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        {/* Forest a 45%, não preto: preto apaga a marca justo no momento em que
            a tela para. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: mostrado.tipo ? VEU_DO_TIPO : VEU_SEM_TIPO },
            estiloDoVeu,
          ]}
        />
        <Animated.View
          testID="dialogo-cartao"
          pointerEvents={interativo ? "auto" : "none"}
          style={[{ width: "100%", maxWidth: 420 }, estiloDoCartao]}
        >
          {mostrado.tipo ? (
            <CartaoComTipo atual={mostrado} tipo={mostrado.tipo} responder={responder} estiloDaFaixa={estiloDaFaixa} />
          ) : (
            <CartaoSemTipo atual={mostrado} responder={responder} />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function CartaoSemTipo({ atual, responder }: Cartao) {
  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={atual.titulo}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 22,
        gap: 16,
        width: "100%",
        maxWidth: 420,
      }}
    >
      <Text
        style={{
          fontFamily: "Archivo_800ExtraBold",
          fontSize: fs(18),
          letterSpacing: -0.4,
          color: FOREST,
        }}
      >
        {atual.titulo}
      </Text>

      {/* Mensagem longa rola em vez de empurrar os botões para fora — erro
          de backend às vezes vem com parágrafo inteiro. */}
      {!!atual.mensagem && (
        <ScrollView style={{ maxHeight: 260 }}>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: fs(14),
              lineHeight: fs(20),
              color: TEXT_SECONDARY,
            }}
          >
            {atual.mensagem}
          </Text>
        </ScrollView>
      )}

      <View style={{ gap: 12 }}>
        {atual.botoes.map((botao, i) => {
          const peso = pesoDoBotao(atual.botoes, i);
          const vazado = peso !== "solido";
          const perigo = peso === "vazado-perigo";
          return (
            <Pressable
              key={`${botao.texto}-${i}`}
              // O destrutivo tem id próprio: a posição dele muda com os
              // botões do meio (ex.: "Adiar minha vez"), e a bateria
              // Maestro não achava o "Sim, sair" pelo texto (02/10).
              testID={botao.estilo === "destructive" ? "dialogo-botao-destrutivo" : `dialogo-botao-${i}`}
              accessibilityRole="button"
              onPress={() => responder(i)}
              style={{
                minHeight: 54,
                borderRadius: 9999,
                paddingHorizontal: 24,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: vazado ? 1.5 : 0,
                // A borda é forest mesmo no destrutivo; só o RÓTULO é danger.
                borderColor: FOREST,
                backgroundColor: vazado ? "transparent" : BRAND_GREEN,
              }}
            >
              <Text
                style={{
                  fontFamily: "Archivo_700Bold",
                  fontSize: fs(16),
                  color: perigo ? DANGER : FOREST,
                }}
              >
                {botao.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Os três papéis do desenho novo (design-modais). O rótulo do primário e do
// secundário é forest nos dois temas; o do perigo é onDanger.
const BOTAO: Record<PapelDoBotao, { fundo: string; texto: string }> = {
  primario: { fundo: TOKENS_CLARO.green, texto: TOKENS_CLARO.onGreen },
  secundario: { fundo: TOKENS_CLARO.surface, texto: TOKENS_CLARO.textPrimary },
  perigo: { fundo: TOKENS_CLARO.danger, texto: TOKENS_CLARO.onDanger },
};

function CartaoComTipo({
  atual,
  tipo,
  responder,
  estiloDaFaixa,
}: Cartao & { tipo: TipoDeDialogo; estiloDaFaixa: EstiloDaFaixa }) {
  const aparencia = aparenciaDoTipo(tipo, atual.selo);
  const Icone = ICONES[tipo];

  return (
    <View
      accessibilityViewIsModal
      accessibilityLabel={atual.titulo}
      // Sem borda e sem sombra no nativo: o véu já separa o cartão, e a borda da
      // mesma cor do fundo é o erro que a faixa veio substituir.
      style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 16, width: "100%" }}
    >
      {aparencia.faixa && (
        // A faixa cresce da esquerda (scaleX); o View de fora segura os 6 px de
        // altura para o cartão não pular quando ela aparece.
        <View style={{ height: 6, marginTop: -4, marginBottom: 12 }}>
          <Animated.View
            testID="dialogo-faixa"
            style={[{ height: 6, borderRadius: 999, backgroundColor: aparencia.corDaFaixa ?? aparencia.fundo }, estiloDaFaixa]}
          />
        </View>
      )}

      <View
        testID="dialogo-selo"
        style={{
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 3,
          paddingHorizontal: 9,
          borderRadius: 999,
          marginBottom: 10,
          backgroundColor: aparencia.fundo,
        }}
      >
        <Icone size={16} color={aparencia.texto} />
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: fs(12), color: aparencia.texto }}>
          {aparencia.selo}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: "Archivo_700Bold",
          fontSize: fs(18),
          letterSpacing: -0.3,
          color: TOKENS_CLARO.textPrimary,
          marginBottom: 6,
        }}
      >
        {atual.titulo}
      </Text>

      {!!atual.mensagem && (
        <ScrollView style={{ maxHeight: 260 }}>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: fs(14),
              lineHeight: fs(20),
              color: TOKENS_CLARO.textSecondary,
            }}
          >
            {atual.mensagem}
          </Text>
        </ScrollView>
      )}

      {/* Primário em cima, "Cancelar" embaixo. O índice devolvido é o da lista
          original, e o id da bateria também: o destrutivo tem id fixo, os outros
          vêm da posição na lista, não da posição na tela. */}
      <View style={{ gap: 8, marginTop: 14 }}>
        {ordemDosBotoes(atual.botoes).map((i) => {
          const botao = atual.botoes[i];
          const cor = BOTAO[papelDoBotao(atual.botoes, i)];
          return (
            <Pressable
              key={`${botao.texto}-${i}`}
              testID={botao.estilo === "destructive" ? "dialogo-botao-destrutivo" : `dialogo-botao-${i}`}
              accessibilityRole="button"
              onPress={() => responder(i)}
              style={{
                minHeight: 54,
                borderRadius: 9999,
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: cor.fundo,
              }}
            >
              <Text style={{ fontFamily: "Archivo_700Bold", fontSize: fs(16), color: cor.texto }}>
                {botao.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
