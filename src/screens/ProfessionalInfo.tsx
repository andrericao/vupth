import { useState } from "react";
import { Alert, ScrollView, Share, TouchableOpacity } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { VStack, Box, Text, HStack, Center } from "@gluestack-ui/themed";
import { Phone, Share2 } from "lucide-react-native";

import { ScreenHeader, HeaderIconButton } from "@components/ScreenHeader";
import { linkParaCompartilhar, raizDoSite } from "@routes/linking";
import { API_ENV } from "@services/api";
import { copiarTexto } from "@utils/copiar";
import { textoDeDivulgacao } from "@domain/divulgacao";
import { PlaceAvatar } from "@components/PlaceAvatar";
import { SkeletonList } from "@components/Skeleton";
import { FotoAmpliada } from "@components/FotoAmpliada";
import { formatarReais } from "@utils/formatarReais";
import { useEstablishment, useProfessionalsWithQueue } from "@hooks/useEstablishments";
import { establishmentService } from "@services/establishmentService";
import { resolveRating } from "@domain/establishment/rating";
import { NotaDaLoja } from "@components/NotaDaLoja";
import { formatSpecialty } from "@domain/establishment/serviceType";
import { contatoDoProfissional } from "@domain/professional/contato";
import { duracaoDoServico } from "@domain/professional/duracaoDoServico";
import { fs } from "@stores/fonteStore";

type RouteParams = {
  professionalId: string;
  establishmentId: string;
  /** Enquanto a lista da loja nao chega (ou ele saiu dela), o nome vem daqui. */
  professionalName?: string;
};

// Informacoes do profissional (mockup-contato v2, Andre 05/10): foto, nome,
// loja, nota, servicos com preco e o telefone SO COMO TEXTO — sem Ligar e sem
// WhatsApp. Chega-se pela ⓘ da loja, pelo nome no topo da escolha do servico e
// pelo "Ver profissional" do detalhe do atendimento. O Compartilhar manda o
// texto do link-de-divulgacao (a loja ja abrindo este profissional).
export function ProfessionalInfo() {
  const route = useRoute();
  const { professionalId, establishmentId, professionalName } = route.params as RouteParams;

  const { data: establishment } = useEstablishment(establishmentId);
  const { data: professionals, isLoading } = useProfessionalsWithQueue(establishmentId);
  const prof = professionals?.find((p) => p.id === professionalId);
  const { data: services = [], isLoading: carregandoServicos } = useQuery({
    queryKey: ["service-items", professionalId],
    queryFn: () =>
      establishmentService.getServiceItemsByProfessional(professionalId).then((r) => r.data),
    enabled: !!professionalId,
    staleTime: 60000,
  });
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  const nome = prof?.name ?? professionalName ?? "";
  const contato = contatoDoProfissional(prof?.contact_phone);
  const nota = resolveRating(prof?.rating_average, prof?.rating_count);
  const foto = prof?.profile_image_url ?? null;

  // O compartilhar do sistema; onde ele nao existe (navegador sem Web Share),
  // copia o texto.
  async function compartilhar() {
    const link = linkParaCompartilhar(raizDoSite(API_ENV), establishmentId, professionalId);
    const texto = textoDeDivulgacao({ loja: establishment?.name ?? "loja", profissional: nome || undefined, link });
    try {
      await Share.share({ message: texto });
    } catch {
      if (await copiarTexto(texto)) Alert.alert("Link copiado", "Cole onde quiser para indicar este profissional.");
    }
  }

  return (
    <VStack flex={1} bg="$brandBackground">
      <Box px={16}>
        <ScreenHeader
          title="Profissional"
          action={
            <HeaderIconButton onPress={compartilhar} testID="compartilhar" accessibilityLabel={`Compartilhar ${nome}`}>
              <Share2 size={20} color="#163300" />
            </HeaderIconButton>
          }
        />
      </Box>

      {isLoading && !prof ? (
        <VStack px={16} mt="$6">
          <SkeletonList count={3} />
        </VStack>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        >
          <VStack alignItems="center" gap="$2" testID="perfil-do-profissional">
            {foto ? (
              <TouchableOpacity
                onPress={() => setFotoAmpliada(foto)}
                accessibilityLabel={`Ver a foto de ${nome}`}
                testID="foto-do-profissional"
              >
                <PlaceAvatar name={nome} photoUrl={foto} size={96} />
              </TouchableOpacity>
            ) : (
              <PlaceAvatar name={nome} size={96} />
            )}
            <Text
              fontFamily="$display"
              fontSize={fs(24)}
              lineHeight={fs(28)}
              letterSpacing={-1}
              color="$forest"
              textAlign="center"
              mt="$2"
            >
              {nome}
            </Text>
            {!!establishment?.name && (
              <Text size="sm" color="$brandTextSecondary" textAlign="center">
                {establishment.name}
              </Text>
            )}
            <HStack alignItems="center" gap="$2">
              <NotaDaLoja
                rating={nota}
                starSize={14}
                gap="$2"
                size="sm"
                fontFamily="$heading"
                color="$brandTextPrimary"
                testID="nota-do-profissional"
              />
              {nota.real && nota.count != null && (
                <Text size="sm" color="$brandTextSecondary">
                  ({nota.count} avaliações)
                </Text>
              )}
              {!!prof?.specialty && (
                <>
                  <Center width={3} height={3} borderRadius="$full" bg="$brandTextSecondary" />
                  <Text size="sm" color="$brandTextSecondary">
                    {formatSpecialty(prof.specialty)}
                  </Text>
                </>
              )}
            </HStack>
          </VStack>

          {/* So texto (Andre, 05/10): o numero que ele escolheu expor, sem botoes.
              Sem contact_phone, a linha nao existe. */}
          {contato && (
            <HStack
              bg="$brandSurface"
              borderRadius={16}
              px="$4"
              py="$3"
              mt="$5"
              alignItems="center"
              gap="$3"
              testID="contato-do-profissional"
            >
              <Phone size={18} color="#163300" />
              <Text flex={1} color="$forest" fontWeight="$semibold" selectable>
                {contato.exibir}
              </Text>
            </HStack>
          )}

          <Text fontFamily="$display" fontSize="$lg" color="$forest" mt="$6" mb="$3">
            Serviços
          </Text>
          {carregandoServicos ? (
            <SkeletonList count={2} />
          ) : services.length === 0 ? (
            <Text color="$brandTextSecondary">Nenhum serviço cadastrado</Text>
          ) : (
            <VStack gap="$2.5">
              {services.map((s) => (
                <HStack
                  key={s.id}
                  bg="$brandSurface"
                  p="$4"
                  borderRadius={16}
                  gap="$3"
                  alignItems="center"
                  testID={`servico-${s.id}`}
                >
                  <VStack flex={1} gap="$0.5">
                    <Text fontFamily="$heading" fontSize="$sm" color="$forest">
                      {s.customName}
                    </Text>
                    <Text size="xs" color="$brandTextSecondary">
                      {duracaoDoServico(s)} min
                    </Text>
                  </VStack>
                  <Text fontFamily="$heading" fontSize="$sm" color="$forest">
                    {formatarReais(s.price)}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </ScrollView>
      )}
      <FotoAmpliada uri={fotoAmpliada} onClose={() => setFotoAmpliada(null)} />
    </VStack>
  );
}
