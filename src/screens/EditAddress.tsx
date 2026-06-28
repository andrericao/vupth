import { useState, useEffect, useCallback } from "react";
import { Alert, ScrollView, TouchableOpacity } from "react-native";
import { VStack, Text, Heading, Box, HStack } from "@gluestack-ui/themed";
import { Star, Trash, PencilSimple } from "phosphor-react-native";

import { Header } from "@components/Header";
import { Input2 } from "@components/Input2";
import { Button } from "@components/Button";
import { useAuthStore } from "@stores/authStore";
import { addressService, AddressResponse, AddressRequest } from "@services/addressService";
import { maskCEP, unmask } from "@utils/masks";
import { lookupCep } from "@utils/cep";
import { SkeletonList } from "@components/Skeleton";
import { cardShadow } from "@utils/styles";

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

  function handleNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMode("form");
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
    });
    setMode("form");
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
        <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
          <Header showBackButton />

          <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$6">
            {editingId ? "Editar Endereço" : "Novo Endereço"}
          </Heading>

          <VStack gap="$3">
            <VStack gap="$1">
              <Text size="sm" color="$gray300">Rua *</Text>
              <Input2 placeholder="Rua das Flores" value={form.street} onChangeText={(v: string) => updateField("street", v)} />
            </VStack>
            <HStack gap="$3">
              <VStack gap="$1" flex={1}>
                <Text size="sm" color="$gray300">Número *</Text>
                <Input2 placeholder="123" value={form.number} onChangeText={(v: string) => updateField("number", v)} />
              </VStack>
              <VStack gap="$1" flex={1}>
                <Text size="sm" color="$gray300">Complemento</Text>
                <Input2 placeholder="Apt 4B" value={form.complement} onChangeText={(v: string) => updateField("complement", v)} />
              </VStack>
            </HStack>
            <VStack gap="$1">
              <Text size="sm" color="$gray300">Bairro *</Text>
              <Input2 placeholder="Centro" value={form.neighborhood} onChangeText={(v: string) => updateField("neighborhood", v)} />
            </VStack>
            <HStack gap="$3">
              <VStack gap="$1" flex={2}>
                <Text size="sm" color="$gray300">Cidade *</Text>
                <Input2 placeholder="São Paulo" value={form.city} onChangeText={(v: string) => updateField("city", v)} />
              </VStack>
              <VStack gap="$1" flex={1}>
                <Text size="sm" color="$gray300">UF *</Text>
                <Input2 placeholder="SP" value={form.state} onChangeText={(v: string) => updateField("state", v)} autoCapitalize="characters" maxLength={2} />
              </VStack>
            </HStack>
            <VStack gap="$1">
              <Text size="sm" color="$gray300">
                CEP *{cepLoading ? " — buscando endereço..." : ""}
              </Text>
              <Input2 placeholder="01310-100" value={form.zipCode} onChangeText={handleCepChange} keyboardType="numeric" maxLength={9} />
            </VStack>
            <VStack gap="$1">
              <Text size="sm" color="$gray300">Referência</Text>
              <Input2 placeholder="Próximo ao metrô" value={form.reference} onChangeText={(v: string) => updateField("reference", v)} />
            </VStack>
          </VStack>

          <VStack mt="$8" gap="$3">
            <Button title={isSaving ? "Salvando..." : "Salvar"} onPress={handleSave} isDisabled={isSaving} />
            <Button title="Cancelar" variant="outline" onPress={() => setMode("list")} />
          </VStack>
        </VStack>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
        <Header showBackButton />

        <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$6">
          Endereços
        </Heading>

        {isLoading ? (
          <SkeletonList count={3} />
        ) : addresses.length === 0 ? (
          <Text color="$gray300">Nenhum endereço cadastrado</Text>
        ) : (
          <VStack gap="$3">
            {addresses.map((addr) => (
              <Box key={addr.userAddressId} bg="$white" p="$4" borderRadius="$2xl" style={cardShadow}>
                <HStack justifyContent="space-between" alignItems="flex-start">
                  <VStack flex={1} mr="$2">
                    <Text fontFamily="$heading" size="sm">
                      {addr.street}, {addr.number}
                      {addr.complement ? ` - ${addr.complement}` : ""}
                    </Text>
                    <Text size="xs" color="$gray300">
                      {addr.neighborhood} — {addr.city}/{addr.state}
                    </Text>
                    <Text size="xs" color="$gray300">CEP: {addr.zipCode}</Text>
                    {addr.isMain && (
                      <HStack alignItems="center" gap="$1" mt="$1">
                        <Star size={14} color="#F59E0B" weight="fill" />
                        <Text size="xs" color="$yellow500">Principal</Text>
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
                      <PencilSimple size={20} color="#00B37E" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(addr.userAddressId)}>
                      <Trash size={20} color="#E63946" />
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
    </ScrollView>
  );
}
