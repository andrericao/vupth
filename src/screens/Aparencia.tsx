import { useState } from "react";
import { Alert, Modal, Pressable, Text as TextoNativo, TouchableOpacity, View } from "react-native";
import { VStack, HStack, Box, Text, ScrollView } from "@gluestack-ui/themed";
import { ChevronRight, Moon, Type } from "lucide-react-native";

import { ScreenHeader } from "@components/ScreenHeader";
import { PASSOS_DA_FONTE, rotuloDoPasso } from "@domain/fonte";
import { PREFERENCIAS, ROTULO_DA_PREFERENCIA, type Preferencia } from "@domain/tema";
import { fs, useFonteStore } from "@stores/fonteStore";
import { useTemaStore } from "@stores/temaStore";
import { useTema } from "@hooks/useTema";
import { ESCURO_LIBERADO } from "@theme/liberacao";

// "Aparência" (Andre, 26/09): o tema e o tamanho da fonte num submenu. O
// tamanho abre uma janela com a DEMONSTRACAO e so vale no "Salvar" — antes
// disso nada recarrega. Ao salvar, o app se redesenha e continua nesta tela.
// O tema (claro, escuro, automatico) abre outra janela, tambem so vale no
// "Salvar". O PADRAO e claro (DEC-75): nada muda para quem nao mexer; e o escuro
// so aparece na escolha quando liberado (src/theme/liberacao.ts).

// A amostra usa o tamanho de BASE + o passo em escolha, e nao o fs(): ela tem
// de mostrar o tamanho que VAI ficar, nao o de agora.
const AMOSTRA_TITULO = 18;
const AMOSTRA_TEXTO = 14;

function Linha({ icone, rotulo, valor, onPress, testID, last }: {
  icone: React.ReactNode; rotulo: string; valor: string; onPress: () => void; testID: string; last?: boolean;
}) {
  const { cores } = useTema();
  return (
    <TouchableOpacity onPress={onPress} testID={testID}>
      <HStack px={16} py={15} gap="$3" alignItems="center">
        {icone}
        <VStack flex={1} gap="$0.5">
          <Text size="xs" color="$brandTextSecondary">{rotulo}</Text>
          <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary">{valor}</Text>
        </VStack>
        <ChevronRight size={18} color={cores.textSecondary} />
      </HStack>
      {!last && <Box height={1} bg="$brandBorder" />}
    </TouchableOpacity>
  );
}

function BotaoDaJanela({ titulo, solido, onPress, testID }: {
  titulo: string; solido?: boolean; onPress: () => void; testID: string;
}) {
  const { cores } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={{
        minHeight: 54,
        borderRadius: 9999,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: solido ? 0 : 1.5,
        // O solido e o botao primario (green com onGreen, igual nos dois temas); o
        // vazado usa textPrimary (forest no claro, quase branco no escuro).
        borderColor: cores.textPrimary,
        backgroundColor: solido ? cores.green : "transparent",
      }}
    >
      <TextoNativo
        style={{ fontFamily: "Archivo_700Bold", fontSize: fs(16), color: solido ? cores.onGreen : cores.textPrimary }}
      >
        {titulo}
      </TextoNativo>
    </Pressable>
  );
}

/**
 * A janela: o veu do tema e o painel. O mesmo molde do DialogoVupth, que nao
 * corta (cancelar-cortado, 09/10, fonte +2): com o VStack e o Button do Gluestack
 * o cartao media menos que o conteudo e o "Cancelar" passava da borda de baixo;
 * View e Pressable puros, altura pelo conteudo.
 */
function Janela({ visivel, aoFechar, testID, children }: {
  visivel: boolean; aoFechar: () => void; testID: string; children: React.ReactNode;
}) {
  const { cores, veu } = useTema();
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <Pressable
        onPress={aoFechar}
        style={{ flex: 1, backgroundColor: veu, justifyContent: "center", paddingHorizontal: 24 }}
      >
        <Pressable onPress={() => {}} testID={testID}>
          {/* O painel e o papel `painel`: branco no claro, surface no escuro. */}
          <View style={{ backgroundColor: cores.painel, borderRadius: 20, padding: 22, gap: 16 }}>{children}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A opcao de uma fileira de pilulas: marcada, ganha o fundo de "selecionado". */
function PilulaDaJanela({ ativo, rotulo, etiqueta, onPress, testID }: {
  ativo: boolean; rotulo: string; etiqueta: string; onPress: () => void; testID: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={etiqueta}
      testID={testID}
      style={{ flex: 1 }}
    >
      <Box bg={ativo ? "$selecionado" : "$sobrePainel"} borderRadius="$full" py={8} alignItems="center">
        <Text fontSize={13} fontWeight="$bold" color={ativo ? "$onSelecionado" : "$brandTextPrimary"}>
          {rotulo}
        </Text>
      </Box>
    </TouchableOpacity>
  );
}

export function Aparencia() {
  const passo = useFonteStore((s) => s.passo);
  const escolher = useFonteStore((s) => s.escolher);
  const { preferencia, cores } = useTema();
  const escolherTema = useTemaStore((s) => s.escolher);
  const [janela, setJanela] = useState<"tema" | "fonte" | null>(null);
  const [rascunho, setRascunho] = useState(passo);
  const [rascunhoDoTema, setRascunhoDoTema] = useState<Preferencia>(preferencia);

  function abrirFonte() {
    setRascunho(passo);
    setJanela("fonte");
  }

  function abrirTema() {
    if (!ESCURO_LIBERADO) {
      Alert.alert("Tema escuro", "O tema escuro chega em breve. Por enquanto o app usa o tema claro.");
      return;
    }
    setRascunhoDoTema(preferencia);
    setJanela("tema");
  }

  const fechar = () => setJanela(null);

  async function salvarFonte() {
    fechar();
    if (rascunho !== passo) await escolher(rascunho);
  }

  async function salvarTema() {
    fechar();
    if (rascunhoDoTema !== preferencia) await escolherTema(rascunhoDoTema);
  }

  return (
    <ScrollView flex={1} bg="$brandBackground" contentContainerStyle={{ flexGrow: 1 }}>
      <VStack px={16} pb={30}>
        <ScreenHeader title="Aparência" subtitle="Tema e tamanho da fonte." />
        <Box mt="$6" borderRadius="$card" overflow="hidden" bg="$brandSurface">
          <Linha
            icone={<Moon size={20} color={cores.textPrimary} />}
            rotulo="Tema"
            valor={ROTULO_DA_PREFERENCIA[preferencia]}
            testID="aparencia-tema"
            onPress={abrirTema}
          />
          <Linha
            icone={<Type size={20} color={cores.textPrimary} />}
            rotulo="Tamanho da fonte"
            valor={rotuloDoPasso(passo)}
            testID="aparencia-fonte"
            onPress={abrirFonte}
            last
          />
        </Box>
      </VStack>

      <Janela visivel={janela === "tema"} aoFechar={fechar} testID="janela-do-tema">
        <Text fontFamily="$heading" fontSize={18} color="$brandTextPrimary">Tema</Text>
        <HStack gap="$2">
          {PREFERENCIAS.map((p) => (
            <PilulaDaJanela
              key={p}
              ativo={rascunhoDoTema === p}
              rotulo={ROTULO_DA_PREFERENCIA[p]}
              etiqueta={`Tema ${ROTULO_DA_PREFERENCIA[p]}`}
              onPress={() => setRascunhoDoTema(p)}
              testID={`tema-${p}`}
            />
          ))}
        </HStack>
        <Text size="xs" color="$brandTextSecondary">Automático segue o tema do aparelho.</Text>
        <View style={{ gap: 12 }}>
          <BotaoDaJanela titulo="Salvar" solido onPress={salvarTema} testID="salvar-tema" />
          <BotaoDaJanela titulo="Cancelar" onPress={fechar} testID="cancelar-tema" />
        </View>
      </Janela>

      <Janela visivel={janela === "fonte"} aoFechar={fechar} testID="janela-da-fonte">
        <Text fontFamily="$heading" fontSize={18} color="$brandTextPrimary">Tamanho da fonte</Text>
        {/* A demonstracao: o tamanho que vai ficar, antes de salvar. */}
        <Box bg="$sobrePainel" borderRadius={14} p={14} testID="amostra-da-fonte">
          <Text fontFamily="$heading" fontSize={AMOSTRA_TITULO + rascunho} color="$brandTextPrimary" testID="amostra-titulo">
            Barbearia do Carlos
          </Text>
          <Text fontSize={AMOSTRA_TEXTO + rascunho} color="$brandTextSecondary" mt="$1">
            Você é o 2º da fila — por volta de 14:30.
          </Text>
        </Box>
        <HStack gap="$2">
          {PASSOS_DA_FONTE.map((p) => (
            <PilulaDaJanela
              key={p}
              ativo={rascunho === p}
              rotulo={rotuloDoPasso(p)}
              etiqueta={`Tamanho ${rotuloDoPasso(p)}`}
              onPress={() => setRascunho(p)}
              testID={`fonte-${p}`}
            />
          ))}
        </HStack>
        <View style={{ gap: 12 }}>
          <BotaoDaJanela titulo="Salvar" solido onPress={salvarFonte} testID="salvar-fonte" />
          <BotaoDaJanela titulo="Cancelar" onPress={fechar} testID="cancelar-fonte" />
        </View>
      </Janela>
    </ScrollView>
  );
}
