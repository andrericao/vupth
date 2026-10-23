import { useCallback, useState } from "react";
import { TouchableOpacity } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { VStack, ScrollView, Text } from "@gluestack-ui/themed";
import { User, Mail, Lock, MapPin } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { MenuItem, Grupo } from "@components/MenuDoPerfil";
import { DeleteAccountModal } from "@components/DeleteAccountModal";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";
import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { addressService, AddressResponse } from "@services/addressService";

// dados-cadastrais-no-submenu (Andre, 17/10): no Perfil, a seção Conta tinha
// os quatro dados todos expandidos. Agora uma linha "Dados cadastrais" abre
// esta tela, e cada linha daqui abre o que abria antes. Só reorganização.
export function DadosCadastrais() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);

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

  // desativar-conta e excluir-conta (Andre, 23/10): sairam de Configuracoes e moram
  // aqui, em vermelho. Mesma caixa de senha; o Backend recusa com 409 quando ha compromisso.
  const [encerrando, setEncerrando] = useState<"excluir" | "desativar" | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erroDaConta, setErroDaConta] = useState<string | null>(null);

  function abrirEncerrar(modo: "excluir" | "desativar") {
    setErroDaConta(null);
    setEncerrando(modo);
  }

  async function encerrarConta(senha: string) {
    if (!accessToken || !encerrando) return;
    const excluir = encerrando === "excluir";
    setProcessando(true);
    setErroDaConta(null);
    try {
      if (excluir) await profileService.deleteAccount(accessToken, senha);
      else await profileService.deactivateAccount(accessToken, senha);
      setEncerrando(null);
      await logout();
      // Esta tela vive na aba Config.; volta para a aba Home (pai = tabs).
      navigation.getParent()?.navigate("homeTab", { screen: "home", pop: true });
    } catch (error: any) {
      const code = error.response?.data?.code;
      if (code === "CURRENT_PASSWORD_INVALID") {
        // 401 de NEGOCIO: erro de campo, nao sessao expirada (o interceptor isenta este codigo).
        setErroDaConta("Senha incorreta. Confira e tente de novo.");
      } else if (code === "ACCOUNT_DELETE_NOT_ALLOWED" || code === "ACCOUNT_DEACTIVATE_NOT_ALLOWED") {
        // Bloqueio TEMPORARIO: a mensagem do Backend diz o que fazer para destravar; exibir como veio.
        setErroDaConta(mensagemDoErro(error, "Você tem um atendimento em andamento. Conclua antes."));
      } else {
        setErroDaConta(mensagemDoErro(error, excluir ? "Erro ao deletar conta" : "Erro ao desativar conta"));
      }
    } finally {
      setProcessando(false);
    }
  }

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
              icon={<User size={20} color="#163300" />}
              label="Dados pessoais"
              value={displayName}
              onPress={() => navigation.navigate("editProfile")}
            />
            <MenuItem
              icon={<Mail size={20} color="#163300" />}
              label="E-mail"
              value={user?.email ?? "—"}
              onPress={() => navigation.navigate("editEmail")}
            />
            <MenuItem
              icon={<Lock size={20} color="#163300" />}
              label="Senha"
              value="••••••"
              onPress={() => navigation.navigate("editPassword")}
            />
            <MenuItem
              icon={<MapPin size={20} color="#163300" />}
              label="Endereços"
              value={displayAddress}
              onPress={() => navigation.navigate("editAddress")}
              last
            />
          </Grupo>
          <VStack mt="$8" alignItems="center" gap="$4">
            <TouchableOpacity onPress={() => abrirEncerrar("desativar")} testID="deactivate-account" accessibilityRole="button">
              <Text size="sm" fontWeight="$semibold" color="$brandDanger">Desativar conta</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => abrirEncerrar("excluir")} testID="delete-account" accessibilityRole="button">
              <Text size="sm" fontWeight="$semibold" color="$brandDanger">Excluir conta</Text>
            </TouchableOpacity>
          </VStack>
        </VStack>
      </VStack>

      <DeleteAccountModal
        visible={encerrando !== null}
        modo={encerrando ?? "excluir"}
        isDeleting={processando}
        error={erroDaConta}
        onConfirm={encerrarConta}
        onClose={() => setEncerrando(null)}
      />
    </ScrollView>
  );
}
