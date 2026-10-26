import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { VStack, Text, ScrollView } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { SeuLinkDeIndicacao } from "@components/SeuLinkDeIndicacao";
import { CartaoTicket } from "@components/CartaoTicket";
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
  validadeDoTicket,
  valorDoTicket,
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
  const usados = encerrados.filter((c) => situacaoDoCupom(c) === "Usado");
  const vencidos = encerrados.filter((c) => situacaoDoCupom(c) !== "Usado");

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
            title="Ativar"
            onPress={usar}
            isLoading={enviando}
            isDisabled={enviando || !cupomDigitado(cupom)}
            testID="cupom-usar"
          />
          {/* promocoes-ativas-clicaveis (André, 24/10): "Promoções ativas"; o cupom abre o código que o
              valida, o link abre o QR e o link (SeuLinkDeIndicacao). */}
          {ativos.length > 0 && (
            <VStack gap="$3" mt="$4" testID="cupons-meus">
              <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">Promoções ativas</Text>
              {ativos.map((c) => (
                <CartaoDoCupom key={c.id} cupom={c} />
              ))}
              <SeuLinkDeIndicacao titulo={null} />
            </VStack>
          )}
          {ativos.length === 0 && <SeuLinkDeIndicacao />}
          {/* cupom-usado-some-da-selecao (André, 24/10): o usado sai da escolha do serviço e mora aqui,
              esmaecido e marcado "Usado"; o vencido, à parte. Sem contagem de ativos. */}
          {usados.length > 0 && (
            <VStack gap="$2" mt="$4" testID="cupons-usados">
              <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">Cupons usados</Text>
              {usados.map((c) => (
                <CartaoDoCupom key={c.id} cupom={c} encerrado />
              ))}
            </VStack>
          )}
          {vencidos.length > 0 && (
            <VStack gap="$2" mt="$4" testID="cupons-vencidos">
              <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">Cupons vencidos</Text>
              {vencidos.map((c) => (
                <CartaoDoCupom key={c.id} cupom={c} encerrado />
              ))}
            </VStack>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}

// card-ticket-pontilhado (André, 24/10): o cupom é um ticket, com o valor grande e a validade;
// usado e vencido ficam esmaecidos, com o estado no lugar do botão.
function CartaoDoCupom({ cupom, encerrado }: { cupom: Campanha; encerrado?: boolean }) {
  return (
    <CartaoTicket
      testID={`cupom-${cupom.id}`}
      rotulo={regraDoCupom(cupom) || undefined}
      valor={valorDoTicket(cupom)}
      nome={nomeDaCampanha(cupom)}
      detalhe={encerrado ? undefined : validadeDoTicket(cupom) || validadeDoCupom(cupom)}
      codigo={cupom.code}
      situacao={encerrado ? situacaoDoCupom(cupom) : undefined}
      onPress={encerrado ? undefined : () => Alert.alert(nomeDaCampanha(cupom), cupom.code ? `Código: ${cupom.code}` : undefined)}
    />
  );
}
