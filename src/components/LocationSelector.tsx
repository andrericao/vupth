import { useState } from "react";
import { Modal, Alert, TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Heading, Divider } from "@gluestack-ui/themed";
import { MapPin, CaretRight } from "phosphor-react-native";

import { Button } from "@components/Button";
import { Input2 } from "@components/Input2";
import { cardShadow } from "@utils/styles";
import { maskCEP } from "@utils/masks";
import { lookupCep } from "@utils/cep";
import { addressService } from "@services/addressService";
import { useAuthStore } from "@stores/authStore";
import { useLocationStore } from "@stores/locationStore";

// Seletor de localização da Home (Fase 1 do filtro por bairro, Andre 2026-07-23).
// Barra clicável mostrando o bairro/cidade atual; abre um modal p/ definir por
// "meu endereço" (logado) ou por CEP (ViaCEP, visitante). A ordenação por
// proximidade vive no domínio (`sortByProximity`).
export function LocationSelector() {
  const location = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);
  const clearLocation = useLocationStore((s) => s.clearLocation);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [open, setOpen] = useState(false);
  const [cep, setCep] = useState("");
  const [busy, setBusy] = useState(false);

  const label = location
    ? [location.neighborhood, location.city].filter(Boolean).join(", ")
    : "Escolher meu bairro";

  async function useMyAddress() {
    if (!accessToken) return;
    setBusy(true);
    try {
      const { data } = await addressService.getMain(accessToken);
      if (!data?.city) {
        Alert.alert("Sem endereço", "Você ainda não tem um endereço cadastrado.");
        return;
      }
      await setLocation({ city: data.city, neighborhood: data.neighborhood, state: data.state });
      setOpen(false);
    } catch {
      Alert.alert("Erro", "Não foi possível ler seu endereço cadastrado.");
    } finally {
      setBusy(false);
    }
  }

  async function useCep() {
    setBusy(true);
    try {
      const addr = await lookupCep(cep);
      if (!addr || !addr.city) {
        Alert.alert("CEP não encontrado", "Confira o CEP e tente de novo.");
        return;
      }
      await setLocation({ city: addr.city, neighborhood: addr.neighborhood, state: addr.state });
      setCep("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} accessibilityRole="button">
        <HStack alignItems="center" gap="$2" py="$1">
          <MapPin size={18} color="#2F432F" weight="fill" />
          <Text size="sm" fontFamily="$heading" color="$green500" flex={1} numberOfLines={1}>
            {label}
          </Text>
          <CaretRight size={16} color="#9CA3AF" />
        </HStack>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Box flex={1} bg="rgba(0,0,0,0.45)" justifyContent="center" px={24}>
          <VStack bg="$white" borderRadius="$2xl" p="$6" style={cardShadow}>
            <Heading fontFamily="$heading" fontSize="$lg">
              Sua localização
            </Heading>
            <Text size="sm" color="$gray300" mt="$1">
              Mostramos primeiro os estabelecimentos do seu bairro e cidade.
            </Text>

            {isAuthenticated && (
              <Button
                title={busy ? "Buscando..." : "Usar meu endereço cadastrado"}
                mt="$5"
                isDisabled={busy}
                onPress={useMyAddress}
              />
            )}

            <HStack alignItems="center" gap="$3" my="$4">
              <Divider flex={1} bg="$gray500" />
              <Text size="xs" color="$gray400">ou pelo CEP</Text>
              <Divider flex={1} bg="$gray500" />
            </HStack>

            <Input2
              placeholder="CEP (ex.: 88010-000)"
              value={cep}
              onChangeText={(t: string) => setCep(maskCEP(t))}
              keyboardType="number-pad"
              maxLength={9}
            />
            <Button
              title={busy ? "Buscando..." : "Usar este CEP"}
              variant="outline"
              mt="$3"
              isDisabled={busy || cep.length < 9}
              onPress={useCep}
            />

            {location && (
              <TouchableOpacity onPress={() => { clearLocation(); setOpen(false); }} disabled={busy}>
                <Text size="sm" color="$gray300" textAlign="center" mt="$4">
                  Ver todos (remover filtro)
                </Text>
              </TouchableOpacity>
            )}

            <Button title="Fechar" variant="outline" mt="$5" onPress={() => setOpen(false)} />
          </VStack>
        </Box>
      </Modal>
    </>
  );
}
