import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, ClipboardList, User } from "lucide-react-native";

import { Home } from "@screens/Home";
import { EstablishmentDetail } from "@screens/EstablishmentDetail";
import { EstablishmentList } from "@screens/EstablishmentList";
import { Login } from "@screens/Login";
import { SignUp } from "@screens/SignUp";
import { CompleteProfile } from "@screens/CompleteProfile";
import { ForgotPassword } from "@screens/ForgotPassword";
import { QueueStatus } from "@screens/QueueStatus";
import { Attendances } from "@screens/Attendances";
import { Settings } from "@screens/Settings";
import { EditProfile } from "@screens/EditProfile";
import { EditEmail } from "@screens/EditEmail";
import { EditPassword } from "@screens/EditPassword";
import { EditAddress } from "@screens/EditAddress";
import { Terms } from "@screens/Terms";
import { Sistema } from "@screens/Sistema";
import { ServiceSelection } from "@screens/ServiceSelection";
import { TabPill, TabLabel, TAB_ACTIVE, TAB_INACTIVE, tabBarShadow } from "@components/TabPill";
import { ServiceType } from "@domain/establishment/types";

export type AppRoutes = {
  home: { filter?: ServiceType | "ALL" } | undefined;
  establishmentList: { filter?: ServiceType | "ALL" } | undefined;
  // `profissional`: chegou por link compartilhado apontando um profissional
  // (`/loja/:id?profissional=...`, 24/09) — a tela abre direto os servicos dele.
  establishmentDetail: { establishmentId: string; profissional?: string };
  login: {
    redirectTo?: string;
    establishmentId?: string;
    professionalId?: string;
    professionalName?: string;
    establishmentName?: string;
    estimatedWaitMinutes?: number;
    serviceItemIds?: string[];
    targetTime?: string;
    establishmentOpen?: boolean;
  };
  signUp: {
    redirectTo?: string;
    establishmentId?: string;
    professionalId?: string;
    professionalName?: string;
    establishmentName?: string;
    estimatedWaitMinutes?: number;
    serviceItemIds?: string[];
    targetTime?: string;
    establishmentOpen?: boolean;
  };
  // Esqueci minha senha (fluxo público): e-mail → código de 6 dígitos → nova senha.
  forgotPassword: { email?: string } | undefined;
  serviceSelection: {
    professionalId: string;
    professionalName: string;
    establishmentId: string;
    establishmentName: string;
    estimatedWaitMinutes: number;
    // Loja aberta AGORA (is_open efetivo)? false => a ação primária vira
    // "Agendar" e o "Solicitar corte" entra no menu. Ausente = aberta.
    establishmentOpen?: boolean;
    // Profissional em "Fora" (fila fechada): entrar na fila NAO age — o caminho
    // e pedir corte, e o profissional decide (Andre, 07/09 e 24/09).
    profissionalFora?: boolean;
    // Seleção de serviços restaurada ao voltar do portão de auth.
    serviceItemIds?: string[];
    // Quantos já esperam na fila deste profissional — a posição do cliente é
    // este número + 1 (ele entra no fim). Opcional: fluxos que não sabem (ex.:
    // volta do login) simplesmente não mostram a linha de posição.
    queueCount?: number;
  };
  queueStatus: {
    professionalId: string;
    establishmentId: string;
    professionalName?: string;
    establishmentName?: string;
    estimatedWaitMinutes?: number;
    serviceItemIds?: string[];
    // Agendar (#40): quando presente, cria o atendimento como intenção com alvo.
    targetTime?: string;
  };
  // Pede o nome logo depois do cadastro. Carrega o destino ORIGINAL, pra
  // terminar exatamente onde o cadastro terminaria (ver `postAuthRoute`).
  completeProfile: {
    redirectTo?: string;
    establishmentId?: string;
    professionalId?: string;
    professionalName?: string;
    establishmentName?: string;
    estimatedWaitMinutes?: number;
    serviceItemIds?: string[];
    targetTime?: string;
    establishmentOpen?: boolean;
  };
  attendances: undefined;
  services: undefined;
  settings: undefined;
  editProfile: undefined;
  editEmail: undefined;
  editPassword: undefined;
  editAddress: undefined;
  terms: undefined;
  sistema: undefined;
};

export type AppNavigatorRoutesProps = NativeStackNavigationProp<AppRoutes>;

const HomeStackNav = createNativeStackNavigator<AppRoutes>();
function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="home" component={Home} />
      <HomeStackNav.Screen name="establishmentList" component={EstablishmentList} />
      <HomeStackNav.Screen name="establishmentDetail" component={EstablishmentDetail} />
      <HomeStackNav.Screen name="serviceSelection" component={ServiceSelection} />
      <HomeStackNav.Screen name="queueStatus" component={QueueStatus} />
      <HomeStackNav.Screen name="login" component={Login} />
      <HomeStackNav.Screen name="signUp" component={SignUp} />
      <HomeStackNav.Screen name="completeProfile" component={CompleteProfile} />
      <HomeStackNav.Screen name="forgotPassword" component={ForgotPassword} />
    </HomeStackNav.Navigator>
  );
}

const AttendancesStackNav = createNativeStackNavigator<AppRoutes>();
function AttendancesStack() {
  return (
    <AttendancesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AttendancesStackNav.Screen name="attendances" component={Attendances} />
    </AttendancesStackNav.Navigator>
  );
}

const SettingsStackNav = createNativeStackNavigator<AppRoutes>();
function SettingsStack() {
  return (
    <SettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStackNav.Screen name="settings" component={Settings} />
      <SettingsStackNav.Screen name="editProfile" component={EditProfile} />
      <SettingsStackNav.Screen name="editEmail" component={EditEmail} />
      <SettingsStackNav.Screen name="editPassword" component={EditPassword} />
      <SettingsStackNav.Screen name="editAddress" component={EditAddress} />
      <SettingsStackNav.Screen name="terms" component={Terms} />
      <SettingsStackNav.Screen name="sistema" component={Sistema} />
    </SettingsStackNav.Navigator>
  );
}

type TabRoutes = {
  homeTab: undefined;
  atendimentosTab: undefined;
  settingsTab: undefined;
};

const Tab = createBottomTabNavigator<TabRoutes>();

export function AuthRoutes() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        // O rotulo fica SEMPRE embaixo do icone. Sem isto o React Navigation
        // decide sozinho e, com a barra baixa, joga o rotulo AO LADO — que com
        // a pilula (larga, 16px de padding horizontal) cai por cima do icone.
        // Foi o que aconteceu: "Início" impresso sobre a casinha.
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          // A altura tem de caber PILULA + ROTULO, medidos: 34 + 13 + 2 de
          // respiro = 49. Com 6 de padding em cima e embaixo, 61 — arredondado
          // pra 64 de folga. Era 62 com padding 8+8, sobrando 46 pra 47 de
          // conteudo: faltava 1px, e o layout colapsava em vez de crescer.
          // O inset inferior entra por cima, pra barra nao ficar sob os botoes
          // do sistema.
          height: 64 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
          ...tabBarShadow,
        },
      }}
    >
      <Tab.Screen
        name="homeTab"
        component={HomeStack}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Início</TabLabel>,
          tabBarIcon: ({ focused, color }) => (
            <TabPill focused={focused}>
              <House size={24} color={color} />
            </TabPill>
          ),
        }}
      />
      <Tab.Screen
        name="atendimentosTab"
        component={AttendancesStack}
        options={{
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Atendimentos</TabLabel>,
          tabBarIcon: ({ focused, color }) => (
            <TabPill focused={focused}>
              <ClipboardList size={24} color={color} />
            </TabPill>
          ),
        }}
      />
      <Tab.Screen
        name="settingsTab"
        component={SettingsStack}
        options={{
          // [marca-vupth] Pencil chama essa aba "Perfil" (Tab Bar Client v3),
          // nao "Config." — o glifo tambem e "user", nao um icone de
          // engrenagem (a tela de destino, Settings.tsx, e a Perfil do .pen).
          tabBarLabel: ({ focused }) => <TabLabel focused={focused}>Perfil</TabLabel>,
          tabBarIcon: ({ focused, color }) => (
            <TabPill focused={focused}>
              <User size={24} color={color} />
            </TabPill>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
