import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { useEffect } from "react";

import { useDialogoStore } from "@stores/dialogo.store";
import { pesoDoBotao } from "@domain/pesoDoBotao";

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
const FOREST = "#163300";
const BRAND_GREEN = "#9FE870";
const DANGER = "#B3261E";
const TEXT_SECONDARY = "#454745";

export function DialogoVupth() {
  const atual = useDialogoStore((s) => s.atual);
  const responder = useDialogoStore((s) => s.responder);
  const marcarHost = useDialogoStore((s) => s.marcarHost);

  useEffect(() => {
    marcarHost(true);
    return () => marcarHost(false);
  }, [marcarHost]);

  if (!atual) return null;

  const indiceCancelar = atual.botoes.findIndex((b) => b.estilo === "cancel");

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Voltar (Android) equivale ao cancelar; sem ele, o único jeito de sair de
      // um aviso seria acertar o botão.
      onRequestClose={() => responder(indiceCancelar >= 0 ? indiceCancelar : 0)}
    >
      <View
        style={{
          flex: 1,
          // Forest a 45%, não preto: preto apaga a marca justo no momento em que
          // a tela para.
          backgroundColor: "#16330073",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
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
              fontSize: 18,
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
                  fontSize: 14,
                  lineHeight: 20,
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
                  testID={`dialogo-botao-${i}`}
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
                      fontSize: 16,
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
      </View>
    </Modal>
  );
}
