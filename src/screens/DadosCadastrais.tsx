import { useCallback, useState } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { VStack, ScrollView } from "@gluestack-ui/themed";
import { User, Mail, Lock, MapPin } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { MenuItem, Grupo } from "@components/MenuDoPerfil";
import { useAuthStore } from "@stores/authStore";
import { addressService, AddressResponse } from "@services/addressService";
import { useTema } from "@hooks/useTema";

// dados-cadastrais-no-submenu (Andre, 17/10): no Perfil, a seção Conta tinha
// os quatro dados todos expandidos. Agora uma linha "Dados cadastrais" abre
// esta tela, e cada linha daqui abre o que abria antes. Só reorganização.
export function DadosCadastrais() {
  const { cores } = useTema();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [mainAddress, setMainAddress] = useState<AddressResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      addressService
        .getMain(accessToken)
        .then(({ data }) => setMainAddress(data))
        .catch(() => setMainAddress(null));
    }, [accessToken]),
  );

  // Como VALOR da linha "Dados pessoais", nome vazio e "Não informado": o
  // campo existe e esta em branco, e dizer isso e o certo.
  const nomeCadastrado = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const displayName = nomeCadastrado || "Não informado";
  const displayAddress = mainAddress
    ? `${mainAddress.street}, ${mainAddress.number} — ${mainAddress.neighborhood}`
    : "Não informado";

  return (
    <ScrollView flex={1} bg="$brandBackground" contentContainerStyle={{ flexGrow: 1 }}>
      <VStack flex={1} px={16} pb={30}>
        <ScreenHeader title="Dados cadastrais" subtitle="Seus dados, e-mail, senha e endereços." />
        <VStack mt="$4">
          <Grupo label="Conta">
            <MenuItem
              icon={<User size={20} color={cores.textPrimary} />}
              label="Dados pessoais"
              value={displayName}
              onPress={() => navigation.navigate("editProfile")}
            />
            <MenuItem
              icon={<Mail size={20} color={cores.textPrimary} />}
              label="E-mail"
              value={user?.email ?? "—"}
              onPress={() => navigation.navigate("editEmail")}
            />
            <MenuItem
              icon={<Lock size={20} color={cores.textPrimary} />}
              label="Senha"
              value="••••••"
              onPress={() => navigation.navigate("editPassword")}
            />
            <MenuItem
              icon={<MapPin size={20} color={cores.textPrimary} />}
              label="Endereços"
              value={displayAddress}
              onPress={() => navigation.navigate("editAddress")}
              last
            />
          </Grupo>
        </VStack>
      </VStack>
    </ScrollView>
  );
}
