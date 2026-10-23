import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { VStack, Text, ScrollView, Box } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { SeuLinkDeIndicacao } from "@components/SeuLinkDeIndicacao";
import { useAuthStore } from "@stores/authStore";
import { avisoDeFimDaCampanha } from "@utils/avisoDeFimDaCampanha";
import { campaignService, Campanha } from "@services/campaignService";
import {
  avisoDeValidade,
  cupomDigitado,
  fimDoErro,
  mensagemDoCupom,
  nomeDaCampanha,
  regraDoCupom,
  saibaMaisDoCupom,
  separarCupons,
  situacaoDoCupom,
  validadeDoCupom,
} from "@domain/campanhas";

// Perfil > Promocoes (cupom-no-app, cupom-em-configuracoes): adicionar o cupom e
// ver os ativos e os encerrados (usados ou vencidos), cada um com a regra e a
// validade. Texto curto (DEC-63). So aparece com CUPOM_LIGADO.
export function Promocoes() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [cupom, setCupom] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [meus, setMeus] = useState<Campanha[]>([]);
  const { ativos, encerrados } = separarCupons(meus);

  const carregar = useCallback(async () => {
    if (!accessToken) return;
    try {
      const { data } = await campaignService.listMine(accessToken);
      setMeus(Array.isArray(data) ? data : []);
    } catch {
      // sem a lista, a tela segue com o campo do cupom.
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function usar() {
    const code = cupomDigitado(cupom);
    if (!accessToken || !code) return;
    setEnviando(true);
    try {
      const { data } = await campaignService.redeem(code, accessToken);
      setCupom("");
      // campanha-encerrada-esgotada-e-validade (DEC-124): o prazo logo na ativacao, com o Saiba mais.
      const validade = avisoDeValidade(data);
      Alert.alert(
        "Cupom ativado",
        [nomeDaCampanha(data), validade].filter(Boolean).join("\n"),
        validade
          ? [
              { text: "Saiba mais", onPress: () => Alert.alert(nomeDaCampanha(data), saibaMaisDoCupom(data)) },
              { text: "Ok" },
            ]
          : undefined,
      );
      carregar();
    } catch (erro) {
      const fim = fimDoErro(erro);
      if (fim) avisoDeFimDaCampanha(fim);
      else Alert.alert("Cupom", mensagemDoCupom(erro));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView flex={1} bg="$brandBackground" contentContainerStyle={{ flexGrow: 1 }}>
      <VStack flex={1} pb={30} px={16}>
        <ScreenHeader title="PROMOÇÕES" />
        <VStack pt={24} gap="$4">
          <VStack gap="$1">
            <Text size="sm" color="$brandTextSecondary">Cupom</Text>
            <Input2
              placeholder="Digite o cupom"
              value={cupom}
              onChangeText={setCupom}
              autoCapitalize="characters"
              testID="cupom-campo"
            />
          </VStack>
          <Button
            title={enviando ? "Enviando..." : "Usar"}
            onPress={usar}
            isDisabled={enviando || !cupomDigitado(cupom)}
            testID="cupom-usar"
          />
          <SeuLinkDeIndicacao />
          {ativos.length > 0 && (
            <VStack gap="$2" mt="$4" testID="cupons-meus">
              <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">Cupons ativos</Text>
              {ativos.map((c) => (
                <CartaoDoCupom key={c.id} cupom={c} />
              ))}
            </VStack>
          )}
          {encerrados.length > 0 && (
            <VStack gap="$2" mt="$4" testID="cupons-encerrados">
              <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">Usados e vencidos</Text>
              {encerrados.map((c) => (
                <CartaoDoCupom key={c.id} cupom={c} encerrado />
              ))}
            </VStack>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}

function CartaoDoCupom({ cupom, encerrado }: { cupom: Campanha; encerrado?: boolean }) {
  const detalhes = [regraDoCupom(cupom), encerrado ? situacaoDoCupom(cupom) : validadeDoCupom(cupom)]
    .filter(Boolean)
    .join(" · ");
  return (
    <Box bg="$brandSurface" borderRadius="$card" px={16} py={12} opacity={encerrado ? 0.6 : 1} testID={`cupom-${cupom.id}`}>
      <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary">{nomeDaCampanha(cupom)}</Text>
      {detalhes !== "" && <Text size="xs" color="$brandTextSecondary">{detalhes}</Text>}
    </Box>
  );
}
