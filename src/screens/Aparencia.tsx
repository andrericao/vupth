import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ChevronRight, Moon, Type } from "lucide-react-native";

import { ScreenHeader } from "@components/ScreenHeader";
import { Button } from "@components/Button";
import { PASSOS_DA_FONTE, rotuloDoPasso } from "@domain/fonte";
import { useFonteStore } from "@stores/fonteStore";

// "Aparência" (Andre, 26/09): o tema e o tamanho da fonte num submenu. O
// tamanho abre uma janela com a DEMONSTRACAO e so vale no "Salvar" — antes
// disso nada recarrega. Ao salvar, o app se redesenha e continua nesta tela.

// A amostra usa o tamanho de BASE + o passo em escolha, e nao o fs(): ela tem
// de mostrar o tamanho que VAI ficar, nao o de agora.
const AMOSTRA_TITULO = 18;
const AMOSTRA_TEXTO = 14;

function Linha({ icone, rotulo, valor, onPress, testID, last }: {
  icone: React.ReactNode; rotulo: string; valor: string; onPress: () => void; testID: string; last?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} testID={testID}>
      <View className="flex-row px-4 py-[15px] gap-3 items-center">
        {icone}
        <View className="flex-1 gap-0.5">
          <Text className="font-body text-xs text-vupth-textSecondary">{rotulo}</Text>
          <Text className="font-body text-sm font-semibold text-vupth-textPrimary">{valor}</Text>
        </View>
        <ChevronRight size={18} color="#454745" />
      </View>
      {!last && <View className="h-px bg-vupth-border" />}
    </TouchableOpacity>
  );
}

export function Aparencia() {
  const passo = useFonteStore((s) => s.passo);
  const escolher = useFonteStore((s) => s.escolher);
  const [janela, setJanela] = useState(false);
  const [rascunho, setRascunho] = useState(passo);

  function abrirFonte() {
    setRascunho(passo);
    setJanela(true);
  }

  async function salvar() {
    setJanela(false);
    if (rascunho !== passo) await escolher(rascunho);
  }

  // NativeWind (DEC-5): mesmas medidas do v1. A amostra segue com o tamanho
  // em `style` — ela mostra o tamanho que VAI ficar, fora da escala atual.
  return (
    <ScrollView className="flex-1 bg-vupth-background" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="px-4 pb-[30px]">
        <ScreenHeader title="Aparência" subtitle="Tema e tamanho da fonte." />
        <View className="mt-6 rounded-card overflow-hidden bg-vupth-surface">
          <Linha
            icone={<Moon size={20} color="#163300" />}
            rotulo="Tema"
            valor="Claro"
            testID="aparencia-tema"
            onPress={() => Alert.alert("Tema escuro", "O tema escuro chega em breve. Por enquanto o app usa o tema claro.")}
          />
          <Linha
            icone={<Type size={20} color="#163300" />}
            rotulo="Tamanho da fonte"
            valor={rotuloDoPasso(passo)}
            testID="aparencia-fonte"
            onPress={abrirFonte}
            last
          />
        </View>
      </View>

      <Modal visible={janela} transparent animationType="fade" onRequestClose={() => setJanela(false)}>
        <Pressable
          onPress={() => setJanela(false)}
          style={{ flex: 1, backgroundColor: "#16330073", justifyContent: "center", paddingHorizontal: 24 }}
        >
          <Pressable onPress={() => {}} testID="janela-da-fonte">
            <View className="bg-white rounded-card p-[22px] gap-4">
              <Text className="font-heading text-lg text-vupth-forest">Tamanho da fonte</Text>
              {/* A demonstracao: o tamanho que vai ficar, antes de salvar. */}
              <View className="bg-vupth-surface rounded-[14px] p-[14px]" testID="amostra-da-fonte">
                <Text
                  className="font-heading text-vupth-forest"
                  style={{ fontSize: AMOSTRA_TITULO + rascunho }}
                  testID="amostra-titulo"
                >
                  Barbearia do Carlos
                </Text>
                <Text className="font-body text-vupth-textSecondary mt-1" style={{ fontSize: AMOSTRA_TEXTO + rascunho }}>
                  Você é o 2º da fila — por volta de 14:30.
                </Text>
              </View>
              <View className="flex-row gap-2">
                {PASSOS_DA_FONTE.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setRascunho(p)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: rascunho === p }}
                    accessibilityLabel={`Tamanho ${rotuloDoPasso(p)}`}
                    testID={`fonte-${p}`}
                    style={{ flex: 1 }}
                  >
                    <View className={`rounded-full py-2 items-center ${rascunho === p ? "bg-vupth-forest" : "bg-vupth-surface"}`}>
                      <Text className={`font-body text-f13 font-bold ${rascunho === p ? "text-vupth-green" : "text-vupth-forest"}`}>
                        {rotuloDoPasso(p)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <Button title="Salvar" onPress={salvar} testID="salvar-fonte" />
              <Button title="Cancelar" variant="outline" onPress={() => setJanela(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
