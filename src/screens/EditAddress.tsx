import { useState, useEffect, useCallback } from "react";
import { Alert, ScrollView, TouchableOpacity } from "react-native";
import { VStack, Text, Box, HStack } from "@gluestack-ui/themed";
import { Star, Trash2, Pencil, MapPin } from "lucide-react-native";

import { ScreenHeader } from "@components/ScreenHeader";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { addressService, AddressResponse, AddressRequest } from "@services/addressService";
import { maskCEP, unmask } from "@utils/masks";
import { lookupCep } from "@utils/cep";
import { SkeletonList } from "@components/Skeleton";
import { useDeviceLocation } from "@hooks/useDeviceLocation";

type Mode = "list" | "form";

const EMPTY_FORM: AddressRequest = {
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
  reference: "",
};

export function EditAddress() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [mode, setMode] = useState<Mode>("list");
  const [addresses, setAddresses] = useState<AddressResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressRequest>(EMPTY_FORM);
  // GPS no endereço (Andre 2026-08-01): preenche rua/bairro/cidade/UF/CEP pelo
  // aparelho e manda as COORDENADAS junto — é delas que sai a distância na Home.
  const { captureDeviceAddress } = useDeviceLocation();
  const [gpsLoading, setGpsLoading] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const { data } = await addressService.list(accessToken);
      setAddresses(data);
    } catch {
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAddresses();
  }, [loadAddresses]);

  // Abrir o formulário já OFERECE o GPS (Andre 2026-08-05: "quando o usuário for
  // editar ou incluir o endereço deve-se pedir para pegar a localização"). O
  // botão manual continua ali para quem recusar ou quiser tentar de novo.
  function offerGps(isEditing: boolean) {
    Alert.alert(
      "Usar sua localização?",
      isEditing
        ? "Posso atualizar este endereço com onde você está agora. Os campos preenchidos pelo GPS serão substituídos."
        : "Posso preencher rua, bairro, cidade e CEP com onde você está agora — e é daí que sai a distância até os estabelecimentos.",
      [
        { text: "Prefiro digitar", style: "cancel" },
        { text: "Usar GPS", onPress: handleUseGps },
      ],
    );
  }

  function handleNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMode("form");
    offerGps(false);
  }

  function handleEdit(addr: AddressResponse) {
    setEditingId(addr.userAddressId);
    setForm({
      street: addr.street,
      number: addr.number,
      complement: addr.complement ?? "",
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      zipCode: maskCEP(addr.zipCode),
      reference: addr.reference ?? "",
      ...(addr.latitude != null ? { latitude: addr.latitude } : {}),
      ...(addr.longitude != null ? { longitude: addr.longitude } : {}),
    });
    setMode("form");
    offerGps(true);
  }

  async function handleSave() {
    if (!accessToken) return;
    if (!form.street || !form.number || !form.neighborhood || !form.city || !form.state || !form.zipCode) {
      Alert.alert("Erro", "Preencha os campos obrigatórios");
      return;
    }
    if (form.zipCode.replace(/\D/g, "").length !== 8) {
      Alert.alert("Erro", "CEP deve ter 8 dígitos");
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...form, zipCode: form.zipCode.replace(/\D/g, "") };
      if (editingId) {
        await addressService.update(editingId, payload, accessToken);
      } else {
        await addressService.create(payload, accessToken);
      }
      await loadAddresses();
      setMode("list");
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Erro ao salvar";
      Alert.alert("Erro", msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    Alert.alert("Remover endereço", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await addressService.remove(id, accessToken);
            await loadAddresses();
          } catch (error: any) {
            Alert.alert("Erro", error.response?.data?.message || "Erro ao remover");
          }
        },
      },
    ]);
  }

  async function handleSetMain(id: string) {
    if (!accessToken) return;
    try {
      await addressService.setMain(id, accessToken);
      await loadAddresses();
    } catch (error: any) {
      Alert.alert("Erro", error.response?.data?.message || "Erro ao definir principal");
    }
  }

  // Preenche o formulário pelo GPS. Só sobrescreve o que o aparelho soube dizer
  // (campo ausente não apaga o que já estava digitado) e sempre guarda lat/lng.
  async function handleUseGps() {
    if (gpsLoading) return;
    setGpsLoading(true);
    try {
      const result = await captureDeviceAddress();
      if (!result) {
        Alert.alert(
          "Não consegui sua localização",
          "Confira se o GPS está ligado e se o VUPTH tem permissão de localização. Você pode preencher pelo CEP.",
        );
        return;
      }
      const { coords, draft } = result;
      setForm((prev) => ({
        ...prev,
        ...draft,
        ...(draft.zipCode ? { zipCode: maskCEP(draft.zipCode) } : {}),
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      if (!draft.street || !draft.number) {
        Alert.alert(
          "Localização capturada 📍",
          "Confira os campos e complete o que faltar (número, complemento).",
        );
      }
    } finally {
      setGpsLoading(false);
    }
  }

  function updateField(field: keyof AddressRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCepChange(value: string) {
    const masked = maskCEP(value);
    setForm((prev) => ({ ...prev, zipCode: masked }));

    if (unmask(masked).length !== 8) return;

    setCepLoading(true);
    const result = await lookupCep(masked);
    setCepLoading(false);
    if (!result) return;

    // Preenche o que o ViaCEP retornou, sem apagar o que ja estava (numero/complemento/referencia ficam intactos).
    setForm((prev) => ({
      ...prev,
      street: result.street || prev.street,
      neighborhood: result.neighborhood || prev.neighborhood,
      city: result.city || prev.city,
      state: result.state || prev.state,
    }));
  }

  if (mode === "form") {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <VStack flex={1} pb={30} px={16} bg="$brandBackground">
          <ScreenHeader title={editingId ? "EDITAR ENDEREÇO" : "NOVO ENDEREÇO"} />
          <VStack pt={24} flex={1}>

          <Button
            title={gpsLoading ? "Localizando..." : "Usar minha localização (GPS)"}
            variant="outline"
            mb="$4"
            isDisabled={gpsLoading}
            testID="address-use-gps"
            onPress={handleUseGps}
          />
          <HStack alignItems="center" gap="$1" mb="$4">
            <MapPin size={12} color="#9CA3AF" />
            <Text size="xs" color="$brandTextSecondary" flex={1}>
              Com o GPS a gente já preenche o endereço e calcula sua distância até os estabelecimentos.
            </Text>
          </HStack>

          <VStack gap="$3">
            <VStack gap="$1">
              <Text size="sm" color="$brandTextSecondary">Rua *</Text>
              <Input2 placeholder="Rua das Flores" value={form.street} onChangeText={(v: string) => updateField("street", v)} />
            </VStack>
            <HStack gap="$3">
              <VStack gap="$1" flex={1}>
                <Text size="sm" color="$brandTextSecondary">Número *</Text>
                <Input2 placeholder="123" value={form.number} onChangeText={(v: string) => updateField("number", v)} />
              </VStack>
              <VStack gap="$1" flex={1}>
                <Text size="sm" color="$brandTextSecondary">Complemento</Text>
                <Input2 placeholder="Apt 4B" value={form.complement} onChangeText={(v: string) => updateField("complement", v)} />
              </VStack>
            </HStack>
            <VStack gap="$1">
              <Text size="sm" color="$brandTextSecondary">Bairro *</Text>
              <Input2 placeholder="Centro" value={form.neighborhood} onChangeText={(v: string) => updateField("neighborhood", v)} />
            </VStack>
            <HStack gap="$3">
              <VStack gap="$1" flex={2}>
                <Text size="sm" color="$brandTextSecondary">Cidade *</Text>
                <Input2 placeholder="São Paulo" value={form.city} onChangeText={(v: string) => updateField("city", v)} />
              </VStack>
              <VStack gap="$1" flex={1}>
                <Text size="sm" color="$brandTextSecondary">UF *</Text>
                <Input2 placeholder="SP" value={form.state} onChangeText={(v: string) => updateField("state", v)} autoCapitalize="characters" maxLength={2} />
              </VStack>
            </HStack>
            <VStack gap="$1">
              <Text size="sm" color="$brandTextSecondary">
                CEP *{cepLoading ? " — buscando endereço..." : ""}
              </Text>
              <Input2 placeholder="01310-100" value={form.zipCode} onChangeText={handleCepChange} keyboardType="numeric" maxLength={9} />
            </VStack>
            <VStack gap="$1">
              <Text size="sm" color="$brandTextSecondary">Referência</Text>
              <Input2 placeholder="Próximo ao metrô" value={form.reference} onChangeText={(v: string) => updateField("reference", v)} />
            </VStack>
          </VStack>

          <VStack mt="$8" gap="$3">
            <Button title={isSaving ? "Salvando..." : "Salvar"} onPress={handleSave} isDisabled={isSaving} />
            <Button title="Cancelar" variant="outline" onPress={() => setMode("list")} />
          </VStack>
          </VStack>
        </VStack>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <VStack flex={1} pb={30} px={16} bg="$brandBackground">
        <ScreenHeader title="ENDEREÇOS" />
        <VStack pt={24} flex={1}>
        {isLoading ? (
          <SkeletonList count={3} />
        ) : addresses.length === 0 ? (
          <Text color="$brandTextSecondary">Nenhum endereço cadastrado</Text>
        ) : (
          <VStack gap="$3">
            {addresses.map((addr) => (
              <Box key={addr.userAddressId} bg="$brandSurface" p="$4" borderRadius="$card">
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <VStack flex={1} mr="$2">
                    <Text fontFamily="$heading" size="sm">
                      {addr.street}, {addr.number}
                      {addr.complement ? ` - ${addr.complement}` : ""}
                    </Text>
                    <Text size="xs" color="$brandTextSecondary">
                      {addr.neighborhood} — {addr.city}/{addr.state}
                    </Text>
                    <Text size="xs" color="$brandTextSecondary">CEP: {addr.zipCode}</Text>
                    {addr.isMain && (
                      <HStack alignItems="center" gap="$1" mt="$1">
                        <Star size={14} color="#163300" fill="#163300" />
                        <Text size="xs" color="$forest" fontFamily="$heading">Principal</Text>
                      </HStack>
                    )}
                  </VStack>
                  <HStack gap="$3">
                    {!addr.isMain && (
                      <TouchableOpacity onPress={() => handleSetMain(addr.userAddressId)}>
                        <Star size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleEdit(addr)}>
                      <Pencil size={20} color="#163300" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(addr.userAddressId)}>
                      <Trash2 size={20} color="#B3261E" />
                    </TouchableOpacity>
                  </HStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        <VStack mt="$6">
          <Button title="Adicionar endereço" onPress={handleNew} />
        </VStack>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
