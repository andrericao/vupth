import { useCallback, useState } from "react";
import { Alert, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { VStack, Text, Box } from "@gluestack-ui/themed";
import QRCode from "react-native-qrcode-svg";

import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { referralService, MinhasIndicacoes } from "@services/referralService";
import { copiarTexto } from "@utils/copiar";
import { contadorDoLink, ganhoAguardando, linkCompleto, mensagemDoLink } from "@domain/compartilhe";

// Perfil > Promocoes > Indique e ganhe (compartilhe-e-ganhe-no-client, DEC-113):
// um cartao por campanha de link em que a pessoa participa, com o link, Copiar,
// Compartilhar, o QR e os contadores. Sem campanha, o bloco some. O ganho nasce
// travado ate o Andre liberar no Painel (pending_release).
export function SeuLinkDeIndicacao({ recarregar = 0 }: { recarregar?: number }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [dados, setDados] = useState<MinhasIndicacoes | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      let vivo = true;
      referralService
        .me(accessToken)
        .then((r) => {
          if (vivo) setDados(r.data && Array.isArray(r.data.campaigns) ? r.data : null);
        })
        .catch(() => {});
      return () => {
        vivo = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, recarregar]),
  );

  if (!dados || dados.campaigns.length === 0) return null;
  const aguardando = ganhoAguardando(dados);

  async function copiar(link: string) {
    const ok = await copiarTexto(link);
    Alert.alert(ok ? "Link copiado" : "Link", ok ? undefined : link);
  }

  async function compartilhar(c: MinhasIndicacoes["campaigns"][number]) {
    try {
      await Share.share({ message: mensagemDoLink(c) });
    } catch {
      Alert.alert("Link", linkCompleto(c.link));
    }
  }

  return (
    <VStack gap="$2" mt="$4" testID="indique-e-ganhe">
      <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">Indique e ganhe</Text>
      {dados.campaigns.map((c) => (
        <VStack key={c.campaign_id} bg="$brandSurface" borderRadius="$card" px={16} py={12} gap="$2" testID={`link-${c.campaign_id}`}>
          <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary">{c.name ?? "Campanha"}</Text>
          <Text size="xs" color="$brandTextSecondary" selectable>{linkCompleto(c.link)}</Text>
          <Box alignItems="center" py="$2" testID={`link-qr-${c.campaign_id}`}>
            <QRCode value={linkCompleto(c.link)} size={140} backgroundColor="white" color="black" />
          </Box>
          <Text size="xs" color="$brandTextSecondary" testID={`link-contador-${c.campaign_id}`}>{contadorDoLink(c)}</Text>
          <Button title="Copiar link" onPress={() => copiar(linkCompleto(c.link))} testID={`link-copiar-${c.campaign_id}`} />
          <Button title="Compartilhar" onPress={() => compartilhar(c)} testID={`link-compartilhar-${c.campaign_id}`} />
        </VStack>
      ))}
      {aguardando !== "" && (
        <Text size="xs" color="$brandTextSecondary" testID="link-a-liberar">{aguardando}</Text>
      )}
    </VStack>
  );
}
