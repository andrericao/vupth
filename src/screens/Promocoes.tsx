import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { VStack, Text, ScrollView, Box } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { campaignService, Campanha } from "@services/campaignService";
import { cupomDigitado, mensagemDoCupom, nomeDaCampanha } from "@domain/campanhas";

// Perfil > Promocoes (cupom-no-app): digitar o cupom e ver os aceitos. Texto
// curto (DEC-63). So aparece com CUPOM_LIGADO.
export function Promocoes() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [cupom, setCupom] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [meus, setMeus] = useState<Campanha[]>([]);

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
      Alert.alert("Cupom ativado", nomeDaCampanha(data));
      carregar();
    } catch (erro) {
      Alert.alert("Cupom", mensagemDoCupom(erro));
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
          {meus.length > 0 && (
            <VStack gap="$2" mt="$4" testID="cupons-meus">
              <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">Seus cupons</Text>
              {meus.map((c) => (
                <Box key={c.id} bg="$brandSurface" borderRadius="$card" px={16} py={12}>
                  <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary">{nomeDaCampanha(c)}</Text>
                </Box>
              ))}
            </VStack>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
}
