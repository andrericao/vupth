import { Alert, Linking, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useTema } from "@hooks/useTema";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  VStack,
  Text,
  Box,
  ScrollView,
  Center,
} from "@gluestack-ui/themed";
import { User, Smartphone, Palette, LifeBuoy, Ticket, Bug } from "lucide-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { ScreenHeader } from "@components/ScreenHeader";
import { nomeDeExibicao } from "@domain/auth/displayName";
import { Button } from "@components/Button";
import { MenuItem, Grupo } from "@components/MenuDoPerfil";
import { VersaoDoApp } from "@components/VersaoDoApp";
import { ReportarProblema } from "@components/ReportarProblema";
import { sentryLigado } from "@utils/sentry";
import { LinksLegais } from "@components/LinksLegais";
import { useAuthStore } from "@stores/authStore";
import { fs } from "@stores/fonteStore";
import { SUPORTE_URL } from "@utils/suporte";
import { CUPOM_LIGADO } from "@domain/campanhas";

export function Settings() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigatorRoutesProps>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const [reportando, setReportando] = useState(false);
  const { cores } = useTema();

  // Mesma regra da Home, numa funcao so — eram duas copias que ja divergiam
  // (aqui caia no e-mail, la caia no texto de visitante).
  const nomeDoTopo = nomeDeExibicao(user);
  // Iniciais do nome; sem nome cadastrado, a primeira letra do e-mail — nunca
  // um circulo vazio.
  const initials =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .map((n) => n![0]?.toUpperCase())
      .join("") || user?.email?.[0]?.toUpperCase() || "?";

  function handleLogout() {
    // Titulo que diz o fato e nenhum corpo (guia de texto, §4.7): a pergunta ja
    // esta nos dois botoes, Sair e Cancelar.
    Alert.alert("Sair da conta", undefined, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          navigation.getParent()?.navigate("homeTab", { screen: "home", pop: true });
        },
      },
    ]);
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
            <Text fontFamily="$display" fontSize={fs(32)} color="$forest">
              {initials}
            </Text>
          </Center>
          <VStack gap="$1" alignItems="center">
            <Text fontFamily="$display" fontSize={fs(24)} letterSpacing={-0.8} color="$white">
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
              {/* dados-cadastrais-no-submenu (17/10): nome e e-mail como resumo; Dados
                  pessoais, E-mail, Senha e Endereços moram na tela que isto abre. */}
              <MenuItem
                icon={<User size={20} color="#163300" />}
                label="Dados cadastrais"
                value={[nomeDoTopo, user?.email].filter(Boolean).join(" · ")}
                onPress={() => navigation.navigate("dadosCadastrais")}
                last
              />
            </Grupo>
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
                  navigation.getParent()?.navigate("homeTab", { screen: "signUp", params: {}, pop: true })
                }
              />
              <Button
                variant="outline"
                title="Já tenho conta"
                onPress={() =>
                  navigation.getParent()?.navigate("homeTab", { screen: "login", params: {}, pop: true })
                }
              />
            </VStack>
          </Box>
        )}

        {/* Aparencia (Andre, 26/09): tema e tamanho da fonte num submenu. So de
            quem tem conta (Andre, 02/10): o visitante ve o convite — Entrar e
            Criar conta —, os Termos e a versao no rodape, e nada mais. */}
        {isAuthenticated && (
        <VStack mt="$6">
          <Grupo label="Aparência">
            <MenuItem
              icon={<Palette size={20} color="#163300" />}
              label="Tema e tamanho da fonte"
              onPress={() => navigation.navigate("aparencia")}
              last
            />
          </Grupo>
        </VStack>
        )}

        {/* Promocoes (cupom-no-app): o cupom. Desligado ate o Backend subir. */}
        {isAuthenticated && CUPOM_LIGADO && (
        <VStack mt="$6">
          <Grupo label="Promoções">
            <MenuItem
              icon={<Ticket size={20} color="#163300" />}
              label="Cupom"
              onPress={() => navigation.navigate("promocoes")}
              last
            />
          </Grupo>
        </VStack>
        )}

        {/* Suporte (botao-suporte): abre o site de suporte no navegador, fora
            do app. So de quem tem conta, como Aparencia e Sistema (o visitante
            ve so o convite, os Termos e a versao — Andre, 02/10). */}
        {isAuthenticated && (
        <VStack mt="$6">
          <Grupo label="Ajuda">
            <MenuItem
              icon={<LifeBuoy size={20} color="#163300" />}
              label="Suporte"
              onPress={() => Linking.openURL(SUPORTE_URL)}
              last
            />
          </Grupo>
        </VStack>
        )}

        {/* O menu "Versão do app" (e os 7 toques do diagnostico) e so de quem
            tem conta (Andre, 26/09). O visitante ve a versao e a data no rodape. */}
        {isAuthenticated && (
        <VStack mt="$6">
          <Grupo label="Sistema">
            {/* sentry-feedback-do-usuario (24/10): so com o Sentry ligado neste binario. */}
            {sentryLigado() && (
              <MenuItem
                icon={<Bug size={20} color={cores.textPrimary} />}
                label="Reportar problema"
                onPress={() => setReportando(true)}
                testID="reportar-problema"
              />
            )}
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
          {/* botao-sair-igual (CLI-3, Andre 15/10) e sair-da-conta-acima-dos-termos (24/10): o Sair e o
              do Partner: texto vermelho, solto, centralizado, sem icone nem caixa, no FIM do Perfil e
              logo ACIMA de "Termos de uso · Politica de privacidade" (junto dos links, no rodape). */}
          {isAuthenticated && (
            <TouchableOpacity
              onPress={handleLogout}
              testID="logout"
              accessibilityRole="button"
              accessibilityLabel="Sair"
              style={{ paddingVertical: 4 }}
            >
              <Text size="sm" fontWeight="$semibold" color="$brandDanger" textAlign="center">
                Sair da conta
              </Text>
            </TouchableOpacity>
          )}
          {/* Os mesmos dois links das telas de entrada (termos-no-rodape), mas
              aqui levam as telas de Termos e Privacidade do proprio app: ja
              existem, e abrir o site tiraria a pessoa do app para ler o mesmo
              texto. Um unico "Termos e Privacidade" nao dizia que eram dois. */}
          <LinksLegais aoAbrir={(pagina) => navigation.navigate(pagina === "termos" ? "terms" : "privacy")} />
          {!isAuthenticated && (
            <VersaoDoApp testID="versao-visitante" />
          )}
        </VStack>
      </VStack>
      <ReportarProblema visivel={reportando} onFechar={() => setReportando(false)} />
    </ScrollView>
  );
}
