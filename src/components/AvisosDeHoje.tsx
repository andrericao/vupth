import { Alert } from "react-native";
import { VStack, HStack, Text, Pressable, Box } from "@gluestack-ui/themed";

import { Grupo } from "@components/MenuDoPerfil";
import { avisosPendentes, rotuloDoAviso } from "@domain/avisoDeAbertura";
import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { useAvisosDeAbertura, useMudarAvisoDeAbertura } from "@hooks/useAvisosDeAbertura";
import { useEstablishment } from "@hooks/useEstablishments";
import type { AvisoDeAbertura } from "@services/openWatchService";

// avisar-quando-abrir-tela, fatia 1 (CLI-26, DEC-160): no Perfil, a lista do que esta pedido para hoje, com o
// Cancelar de cada um. So os que ainda vao avisar; sem nenhum, o grupo nem aparece.

function Linha({ aviso, ultimo, onCancelar }: { aviso: AvisoDeAbertura; ultimo: boolean; onCancelar: (id: string) => void }) {
  const { data: loja } = useEstablishment(aviso.establishment_id);
  return (
    <HStack
      px="$4"
      py="$3"
      alignItems="center"
      gap="$3"
      borderBottomWidth={ultimo ? 0 : 1}
      borderColor="$brandBorder"
      testID={`aviso-de-hoje-${aviso.id}`}
    >
      <VStack flex={1}>
        <Text size="sm" color="$brandTextPrimary" numberOfLines={1}>
          {loja?.name ?? "Loja"}
        </Text>
        <Text size="xs" color="$brandTextSecondary">
          {rotuloDoAviso(aviso.kind)} · só hoje
        </Text>
      </VStack>
      <Pressable onPress={() => onCancelar(aviso.id)} accessibilityRole="button" hitSlop={8} testID={`aviso-de-hoje-cancelar-${aviso.id}`}>
        <Text size="xs" fontFamily="$heading" color="$brandDanger">
          Cancelar
        </Text>
      </Pressable>
    </HStack>
  );
}

export function AvisosDeHoje() {
  const { data } = useAvisosDeAbertura();
  const { cancelar } = useMudarAvisoDeAbertura();
  const pendentes = avisosPendentes(data);
  if (pendentes.length === 0) return null;

  const onCancelar = (id: string) =>
    cancelar.mutate(id, {
      onError: (erro) => Alert.alert("Aviso", mensagemDoErro(erro, "Não foi possível cancelar agora. Tente de novo.")),
    });

  return (
    <Box mt="$6" testID="avisos-de-hoje">
      <Grupo label="Avisos de hoje">
        {pendentes.map((a, i) => (
          <Linha key={a.id} aviso={a} ultimo={i === pendentes.length - 1} onCancelar={onCancelar} />
        ))}
      </Grupo>
    </Box>
  );
}
