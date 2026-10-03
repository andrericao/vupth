import { useState, useCallback } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, Mail, Lock, MapPin, ChevronRight, LogOut, Smartphone, Palette } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { nomeDeExibicao } from "@domain/auth/displayName";
import { rotuloDaVersao } from "@domain/versao";
import { Button } from "@components/Button";
import { DeleteAccountModal } from "@components/DeleteAccountModal";
import { useAuthStore } from "@stores/authStore";
import { profileService } from "@services/profileService";
import { addressService, AddressResponse } from "@services/addressService";
import { fs } from "@stores/fonteStore";

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
      <View className="flex-row px-4 py-[15px] gap-3 items-center">
        {icon}
        <View className="flex-1 gap-0.5">
          <Text className="font-body text-xs text-vupth-textSecondary">
            {label}
          </Text>
          {value && (
            <Text className="font-body text-sm font-semibold text-vupth-textPrimary" numberOfLines={1}>
              {value}
            </Text>
          )}
        </View>
        <ChevronRight size={18} color="#454745" />
      </View>
      {!last && <View className="h-px bg-vupth-border" />}
    </TouchableOpacity>
  );
}

// Rotulo em caixa alta sobre um card: o mesmo agrupamento do menu do partner
// (Andre 2026-09-16: "o menu igual o do partner, com submenus").
function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2" testID={`grupo-${label}`}>
      <Text className="font-body text-f11 font-bold tracking-[0.6px] text-vupth-textSecondary">
        {label.toUpperCase()}
      </Text>
      <View className="rounded-card overflow-hidden bg-vupth-surface">
        {children}
      </View>
    </View>
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
    // NativeWind (DEC-5): mesmas medidas do v1.
    <ScrollView
      className="flex-1 bg-vupth-background"
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
        <View className="bg-vupth-forest pb-8 px-4 gap-3 items-center" style={{ paddingTop: insets.top + 24 }}>
          <View className="w-[88px] h-[88px] rounded-full bg-vupth-green items-center justify-center">
            <Text className="font-display text-f32 text-vupth-forest">
              {initials}
            </Text>
          </View>
          <View className="gap-1 items-center">
            <Text className="font-display text-white" style={{ fontSize: fs(24), letterSpacing: -0.8 }}>
              {nomeDoTopo}
            </Text>
            {user?.email && (
              <Text className="font-body text-sm text-vupth-green">
                {user.email}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View className="px-4">
          <ScreenHeader root title="Perfil" />
        </View>
      )}

      <View className="flex-1 px-4 pt-5 pb-[30px]">

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
              <View className="flex-row bg-vupth-surface rounded-card px-4 py-[15px] mt-4 gap-2.5 items-center">
                <LogOut size={19} color="#163300" />
                <Text className="font-body text-sm font-semibold text-vupth-forest">
                  Sair da conta
                </Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          /* Pro VISITANTE o convite e o UNICO conteudo da tela. Encostado no
             topo, ele deixava um vazio grande no meio que fazia a tela parecer
             inacabada; centrado, o espaco vira respiro em vez de falta. */
          <View className="bg-vupth-surface rounded-card p-4 mt-6">
            <Text className="font-body text-sm text-vupth-textSecondary mb-3">
              Você está navegando como visitante. Entre ou crie uma conta para
              gerenciar seu perfil, senha e endereço.
            </Text>
            {/* Mesma hierarquia do Perfil: criar conta é a pílula sólida, entrar
                fica como secundária (Andre 2026-08-05). */}
            <View className="gap-3">
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
            </View>
          </View>
        )}

        {/* Aparencia (Andre, 26/09): tema e tamanho da fonte num submenu. So de
            quem tem conta (Andre, 02/10): o visitante ve o convite — Entrar e
            Criar conta —, os Termos e a versao no rodape, e nada mais. */}
        {isAuthenticated && (
        <View className="mt-6">
          <Grupo label="Aparência">
            <MenuItem
              icon={<Palette size={20} color="#163300" />}
              label="Tema e tamanho da fonte"
              onPress={() => navigation.navigate("aparencia")}
              last
            />
          </Grupo>
        </View>
        )}

        {/* O menu "Versão do app" (e os 7 toques do diagnostico) e so de quem
            tem conta (Andre, 26/09). O visitante ve a versao e a data no rodape. */}
        {isAuthenticated && (
        <View className="mt-6">
          <Grupo label="Sistema">
            <MenuItem
              icon={<Smartphone size={20} color="#163300" />}
              label="Versão do app"
              onPress={() => navigation.navigate("sistema")}
              last
            />
          </Grupo>
        </View>
        )}

        {/* `flex-end` empurra o rodape pro fim: antes ele vinha logo abaixo do
            conteudo e sobrava um vazio grande embaixo, que fazia a tela
            parecer inacabada — principalmente pro VISITANTE, que so tem o
            convite de conta acima. */}
        <View className="flex-1 justify-end mt-10 items-center gap-3">
          {/* Deletar conta desce pra ca como LINK: e irreversivel, entao nao
              disputa atencao com o resto — mas continua alcancavel por quem
              procura (era um botao de mesmo peso que "sair"). */}
          <View className="flex-row gap-4 items-center">
            <TouchableOpacity onPress={() => navigation.navigate("terms")} testID="terms">
              <Text className="font-body text-xs text-vupth-textSecondary">
                Termos e Privacidade
              </Text>
            </TouchableOpacity>
            {isAuthenticated && (
              <TouchableOpacity onPress={openDeleteAccount} testID="delete-account">
                <Text className="font-body text-xs font-semibold text-vupth-danger">
                  Deletar minha conta
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {!isAuthenticated && (
            <Text className="font-body text-f10 text-vupth-textSecondary" testID="versao-visitante">
              {rotuloDaVersao(Updates.runtimeVersion, Updates.createdAt)}
            </Text>
          )}
        </View>
      </View>

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
