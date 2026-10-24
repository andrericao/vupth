import { useCallback, useState } from "react";
import { Alert, Modal, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { VStack, Text, Box } from "@gluestack-ui/themed";
import QRCode from "react-native-qrcode-svg";

import { Button } from "@components/Button";
import { CartaoTicket } from "@components/CartaoTicket";
import { useTema } from "@hooks/useTema";
import { useAuthStore } from "@stores/authStore";
import { referralService, MinhasIndicacoes } from "@services/referralService";
import { copiarTexto } from "@utils/copiar";
import { contadorDoLink, ganhoAguardando, linkCompleto, mensagemDoLink } from "@domain/compartilhe";

// Perfil > Promocoes > Promocoes ativas (compartilhe-e-ganhe-no-client, DEC-113;
// promocoes-ativas-clicaveis, André 24/10): um ticket clicavel por campanha de link em que a
// pessoa participa; tocar abre o link, o QR, os contadores, Copiar e Compartilhar. Sem campanha, o bloco some. O ganho nasce
// travado ate o Andre liberar no Painel (pending_release).
export function SeuLinkDeIndicacao({ recarregar = 0, titulo = "Promoções ativas" }: { recarregar?: number; titulo?: string | null }) {
  const { veu } = useTema();
  const [aberta, setAberta] = useState<string | null>(null);
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

  const aberto = dados.campaigns.find((c) => c.campaign_id === aberta) ?? null;

  return (
    <VStack gap="$3" mt={titulo ? "$4" : "$0"} testID="indique-e-ganhe">
      {titulo ? <Text size="sm" fontWeight="$bold" color="$brandTextSecondary">{titulo}</Text> : null}
      {dados.campaigns.map((c) => (
        <CartaoTicket
          key={c.campaign_id}
          testID={`link-${c.campaign_id}`}
          rotulo="Indique e ganhe"
          nome={c.name ?? "Campanha"}
          detalhe={contadorDoLink(c)}
          onPress={() => setAberta(c.campaign_id)}
        />
      ))}
      {aguardando !== "" && (
        <Text size="xs" color="$brandTextSecondary" testID="link-a-liberar">{aguardando}</Text>
      )}
      <Modal visible={aberto != null} transparent animationType="fade" onRequestClose={() => setAberta(null)}>
        <Box flex={1} bg={veu} justifyContent="center" px={24} py={24}>
          {aberto && (
            <VStack bg="$brandSurface" borderRadius="$card" px={20} py={20} gap="$4" testID={`link-detalhe-${aberto.campaign_id}`}>
              <Text size="md" fontWeight="$bold" color="$brandTextPrimary">{aberto.name ?? "Campanha"}</Text>
              <Text size="xs" color="$brandTextSecondary" selectable>{linkCompleto(aberto.link)}</Text>
              <Box alignItems="center" py="$2" testID={`link-qr-${aberto.campaign_id}`}>
                <QRCode value={linkCompleto(aberto.link)} size={160} backgroundColor="white" color="black" />
              </Box>
              <Text size="xs" color="$brandTextSecondary" testID={`link-contador-${aberto.campaign_id}`}>{contadorDoLink(aberto)}</Text>
              {/* o Compartilhar não encosta no card: botões com vão de 12 px, dentro do próprio painel */}
              <VStack gap="$3">
                <Button title="Copiar link" onPress={() => copiar(linkCompleto(aberto.link))} testID={`link-copiar-${aberto.campaign_id}`} />
                <Button title="Compartilhar" onPress={() => compartilhar(aberto)} testID={`link-compartilhar-${aberto.campaign_id}`} />
                <Button title="Fechar" variant="outline" onPress={() => setAberta(null)} testID="link-fechar" />
              </VStack>
            </VStack>
          )}
        </Box>
      </Modal>
    </VStack>
  );
}
