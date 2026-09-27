import { useState, useCallback } from "react";
import { Alert, TouchableOpacity } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  VStack,
  Text,
  Box,
  HStack,
  ScrollView,
  Center,
} from "@gluestack-ui/themed";
import { User, Mail, Lock, MapPin, ChevronRight, LogOut, Smartphone } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { nomeDeExibicao } from "@domain/auth/displayName";
import { rotuloDaVersao } from "@domain/versao";
import { Button } from "@components/Button";
import { DeleteAccountModal } from "@components/DeleteAccountModal";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";
import { addressService, AddressResponse } from "@services/addressService";

function MenuItem({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  /** Ultima linha do card nao leva divisor. */
  last?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <HStack px={16} py={15} gap="$3" alignItems="center">
        {icon}
        <VStack flex={1} gap="$0.5">
          <Text size="xs" color="$brandTextSecondary">
            {label}
          </Text>
          {value && (
            <Text size="sm" fontWeight="$semibold" color="$brandTextPrimary" numberOfLines={1}>
              {value}
            </Text>
          )}
        </VStack>
        <ChevronRight size={18} color="#454745" />
      </HStack>
      {!last && <Box height={1} bg="$brandBorder" />}
    </TouchableOpacity>
  );
}

// Rotulo em caixa alta sobre um card: o mesmo agrupamento do menu do partner
// (Andre 2026-09-16: "o menu igual o do partner, com submenus").
function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap="$2">
      <Text fontSize={15} fontWeight="$bold" letterSpacing={0.6} color="$brandTextSecondary">
        {label.toUpperCase()}
      </Text>
      <Box borderRadius="$card" overflow="hidden" bg="$brandSurface">
        {children}
      </Box>
    </VStack>
  );
}

export function Settings() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const [mainAddress, setMainAddress] = useState<AddressResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      addressService.getMain(accessToken)
        .then(({ data }) => setMainAddress(data))
        .catch(() => setMainAddress(null));
    }, [accessToken]),
  );

  // Duas leituras diferentes do mesmo dado, por isso duas variaveis:
  //  · como VALOR da linha "Dados pessoais", vazio e "Não informado" — o campo
  //    existe e esta em branco, e dizer isso e o certo.
  //  · como NOME no topo, "Não informado" vira um nome falso: a pessoa le o
  //    proprio cartao de identidade e nao se reconhece. Sem nome cadastrado o
  //    topo cai no apelido do e-mail, que e sempre alguma coisa dela.
  // (O nome nunca chega a ser pedido: nao existe tela de completar perfil
  //  depois do cadastro. Enquanto ela nao existir, este e o menor mal.)
  const nomeCadastrado = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const displayName = nomeCadastrado || "Não informado";
  // Mesma regra da Home, numa funcao so — eram duas copias que ja divergiam
  // (aqui caia no e-mail, la caia no texto de visitante).
  const nomeDoTopo = nomeDeExibicao(user);
  const displayAddress = mainAddress
    ? `${mainAddress.street}, ${mainAddress.number} — ${mainAddress.neighborhood}`
    : "Não informado";
  // Iniciais do nome; sem nome cadastrado, a primeira letra do e-mail — nunca
  // um circulo vazio.
  const initials =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .map((n) => n![0]?.toUpperCase())
      .join("") || user?.email?.[0]?.toUpperCase() || "?";

  function handleLogout() {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.getParent()?.navigate("homeTab", { screen: "home" });
        },
      },
    ]);
  }

  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openDeleteAccount() {
    setDeleteError(null);
    setShowDelete(true);
  }

  // Contrato novo do backend (2026-08-07): exige a senha atual no corpo. Antes
  // mandávamos DELETE sem corpo e tomávamos 400 — o botão estava quebrado.
  async function handleDeleteAccount(currentPassword: string) {
    if (!accessToken) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await profileService.deleteAccount(accessToken, currentPassword);
      setShowDelete(false);
      await logout();
      // Settings vive na aba Config.; volta para a aba Home (pai = tabs).
      navigation.getParent()?.navigate("homeTab", { screen: "home" });
    } catch (error: any) {
      const code = error.response?.data?.code;
      const msg = error.response?.data?.message;

      if (code === "CURRENT_PASSWORD_INVALID") {
        // 401 de NEGÓCIO: erro de campo, não sessão expirada. O interceptor
        // global já isenta este código de deslogar (ver `api.ts`).
        setDeleteError("Senha incorreta. Confira e tente de novo.");
      } else if (code === "ACCOUNT_DELETE_NOT_ALLOWED") {
        // Bloqueio TEMPORÁRIO. A mensagem do backend diz o que fazer para
        // destravar (sair da fila, encerrar o atendimento, esperar a loja
        // esvaziar) — exibir como veio. Transformar em "não é possível apagar
        // esta conta" reprovaria na publicação das lojas de app.
        setDeleteError(msg ?? "Você tem um atendimento em andamento. Conclua antes de apagar a conta.");
      } else {
        setDeleteError(msg || error.message || "Erro ao deletar conta");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Cabecalho forest com a identidade (Pencil CLIENT · 14 Perfil): o
          avatar em brand-green e o unico ponto de verde-limao da tela, e ele
          esta sobre fundo escuro — a regra de contraste da marca. */}
      {/* O bloco forest so se justifica quando ha IDENTIDADE pra mostrar
          (avatar, nome, e-mail). Pra visitante ele virava uma faixa escura
          carregando so um titulo — mesmo problema da faixa verde da tela da
          loja. Sem conta, o cabecalho e o mesmo da aba Atendimentos: titulo
          em Archivo sobre o fundo claro. */}
      {isAuthenticated ? (
        <VStack bg="$forest" style={{ paddingTop: insets.top + 24 }} pb={32} px={16} gap="$3" alignItems="center">
          <Center width={88} height={88} borderRadius={44} bg="$brandGreen">
            <Text fontFamily="$display" fontSize={36} color="$forest">
              {initials}
            </Text>
          </Center>
          <VStack gap="$1" alignItems="center">
            <Text fontFamily="$display" fontSize={28} letterSpacing={-0.8} color="$white">
              {nomeDoTopo}
            </Text>
            {user?.email && (
              <Text size="sm" color="$brandGreen">
                {user.email}
              </Text>
            )}
          </VStack>
        </VStack>
      ) : (
        <Box px={16}>
          <ScreenHeader root title="Perfil" />
        </Box>
      )}

      <VStack flex={1} px={16} pt={20} pb={30}>

        {/* Opções de CONTA só para quem tem conta (visitante não vê trocar senha,
            e-mail, endereço nem deletar — boa prática; pedido Andre 2026-07-23). */}
        {isAuthenticated ? (
          <>
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

            {/* Sair NAO e vermelho: e uma saida legitima, nao um erro. O
                vermelho fica reservado pro que e irreversivel (deletar), la
                embaixo. */}
            <TouchableOpacity onPress={handleLogout} testID="logout">
              <HStack
                bg="$brandSurface"
                borderRadius="$card"
                px={16}
                py={15}
                mt="$4"
                gap="$2.5"
                alignItems="center"
              >
                <LogOut size={19} color="#163300" />
                <Text size="sm" fontWeight="$semibold" color="$forest">
                  Sair da conta
                </Text>
              </HStack>
            </TouchableOpacity>
          </>
        ) : (
          /* Pro VISITANTE o convite e o UNICO conteudo da tela. Encostado no
             topo, ele deixava um vazio grande no meio que fazia a tela parecer
             inacabada; centrado, o espaco vira respiro em vez de falta. */
          <Box bg="$brandSurface" borderRadius="$card" p="$4" mt="$6">
            <Text size="sm" color="$brandTextSecondary" mb="$3">
              Você está navegando como visitante. Entre ou crie uma conta para
              gerenciar seu perfil, senha e endereço.
            </Text>
            {/* Mesma hierarquia do Perfil: criar conta é a pílula sólida, entrar
                fica como secundária (Andre 2026-08-05). */}
            <VStack gap="$3">
              <Button
                title="Criar conta grátis"
                onPress={() =>
                  navigation.getParent()?.navigate("homeTab", { screen: "signUp", params: {} })
                }
              />
              <Button
                variant="outline"
                title="Já tenho conta"
                onPress={() =>
                  navigation.getParent()?.navigate("homeTab", { screen: "login", params: {} })
                }
              />
            </VStack>
          </Box>
        )}

        {/* O menu "Versão do app" (e os 7 toques do diagnostico) e so de quem
            tem conta (Andre, 26/09). O visitante ve a versao e a data no rodape. */}
        {isAuthenticated && (
        <VStack mt="$6">
          <Grupo label="Sistema">
            <MenuItem
              icon={<Smartphone size={20} color="#163300" />}
              label="Versão do app"
              onPress={() => navigation.navigate("sistema")}
              last
            />
          </Grupo>
        </VStack>
        )}

        {/* `flex-end` empurra o rodape pro fim: antes ele vinha logo abaixo do
            conteudo e sobrava um vazio grande embaixo, que fazia a tela
            parecer inacabada — principalmente pro VISITANTE, que so tem o
            convite de conta acima. */}
        <VStack flex={1} justifyContent="flex-end" mt="$10" alignItems="center" gap="$3">
          {/* Deletar conta desce pra ca como LINK: e irreversivel, entao nao
              disputa atencao com o resto — mas continua alcancavel por quem
              procura (era um botao de mesmo peso que "sair"). */}
          <HStack gap="$4" alignItems="center">
            <TouchableOpacity onPress={() => navigation.navigate("terms")} testID="terms">
              <Text size="xs" color="$brandTextSecondary">
                Termos e Privacidade
              </Text>
            </TouchableOpacity>
            {isAuthenticated && (
              <TouchableOpacity onPress={openDeleteAccount} testID="delete-account">
                <Text size="xs" fontWeight="$semibold" color="$brandDanger">
                  Deletar minha conta
                </Text>
              </TouchableOpacity>
            )}
          </HStack>
          {!isAuthenticated && (
            <Text size="2xs" color="$brandTextSecondary" testID="versao-visitante">
              {rotuloDaVersao(Updates.runtimeVersion, Updates.createdAt)}
            </Text>
          )}
        </VStack>
      </VStack>

      <DeleteAccountModal
        visible={showDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteAccount}
        onClose={() => setShowDelete(false)}
      />
    </ScrollView>
  );
}
