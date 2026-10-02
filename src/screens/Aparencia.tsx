import { useState } from "react";
import { Alert, Modal, Pressable, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, ScrollView } from "@gluestack-ui/themed";
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
      <HStack px={16} py={15} gap="$3" alignItems="center">
        {icone}
        <VStack flex={1} gap="$0.5">
          <Text size="xs" color="$brandTextSecondary">{rotulo}</Text>
          <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary">{valor}</Text>
        </VStack>
        <ChevronRight size={18} color="#454745" />
      </HStack>
      {!last && <Box height={1} bg="$brandBorder" />}
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

  return (
    <ScrollView flex={1} bg="$brandBackground" contentContainerStyle={{ flexGrow: 1 }}>
      <VStack px={16} pb={30}>
        <ScreenHeader title="Aparência" subtitle="Tema e tamanho da fonte." />
        <Box mt="$6" borderRadius="$card" overflow="hidden" bg="$brandSurface">
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
        </Box>
      </VStack>

      <Modal visible={janela} transparent animationType="fade" onRequestClose={() => setJanela(false)}>
        <Pressable
          onPress={() => setJanela(false)}
          style={{ flex: 1, backgroundColor: "#16330073", justifyContent: "center", paddingHorizontal: 24 }}
        >
          <Pressable onPress={() => {}} testID="janela-da-fonte">
            <VStack bg="$white" borderRadius={20} p={22} gap="$4">
              <Text fontFamily="$heading" fontSize={18} color="$forest">Tamanho da fonte</Text>
              {/* A demonstracao: o tamanho que vai ficar, antes de salvar. */}
              <Box bg="$brandSurface" borderRadius={14} p={14} testID="amostra-da-fonte">
                <Text fontFamily="$heading" fontSize={AMOSTRA_TITULO + rascunho} color="$forest" testID="amostra-titulo">
                  Barbearia do Carlos
                </Text>
                <Text fontSize={AMOSTRA_TEXTO + rascunho} color="$brandTextSecondary" mt="$1">
                  Você é o 2º da fila — por volta de 14:30.
                </Text>
              </Box>
              <HStack gap="$2">
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
                    <Box bg={rascunho === p ? "$forest" : "$brandSurface"} borderRadius="$full" py={8} alignItems="center">
                      <Text fontSize={13} fontWeight="$bold" color={rascunho === p ? "$brandGreen" : "$forest"}>
                        {rotuloDoPasso(p)}
                      </Text>
                    </Box>
                  </TouchableOpacity>
                ))}
              </HStack>
              <Button title="Salvar" onPress={salvar} testID="salvar-fonte" />
              <Button title="Cancelar" variant="outline" onPress={() => setJanela(false)} />
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
