import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, ClipboardText, Gear } from "phosphor-react-native";

import { Home } from "@screens/Home";
import { EstablishmentDetail } from "@screens/EstablishmentDetail";
import { Login } from "@screens/Login";
import { SignUp } from "@screens/SignUp";
import { QueueStatus } from "@screens/QueueStatus";
import { Profile } from "@screens/Profile";
import { Attendances } from "@screens/Attendances";
import { Settings } from "@screens/Settings";
import { EditProfile } from "@screens/EditProfile";
import { EditEmail } from "@screens/EditEmail";
import { EditPassword } from "@screens/EditPassword";
import { EditAddress } from "@screens/EditAddress";
import { ServiceSelection } from "@screens/ServiceSelection";
import { TabPill, TAB_ACTIVE, TAB_INACTIVE, tabBarShadow } from "@components/TabPill";
import { ServiceType } from "@domain/establishment/types";

export type AppRoutes = {
  home: { filter?: ServiceType | "ALL" } | undefined;
  establishmentDetail: { establishmentId: string };
  login: { redirectTo?: string; establishmentId?: string; professionalId?: string };
  signUp: { redirectTo?: string; establishmentId?: string; professionalId?: string };
  serviceSelection: {
    professionalId: string;
    professionalName: string;
    establishmentId: string;
    establishmentName: string;
    estimatedWaitMinutes: number;
  };
  queueStatus: {
    professionalId: string;
    establishmentId: string;
    professionalName?: string;
    establishmentName?: string;
    estimatedWaitMinutes?: number;
    serviceItemIds?: string[];
  };
  profile: undefined;
  attendances: undefined;
  services: undefined;
  settings: undefined;
  editProfile: undefined;
  editEmail: undefined;
  editPassword: undefined;
  editAddress: undefined;
};

export type AppNavigatorRoutesProps = NativeStackNavigationProp<AppRoutes>;

const HomeStackNav = createNativeStackNavigator<AppRoutes>();
function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="home" component={Home} />
      <HomeStackNav.Screen name="establishmentDetail" component={EstablishmentDetail} />
      <HomeStackNav.Screen name="serviceSelection" component={ServiceSelection} />
      <HomeStackNav.Screen name="queueStatus" component={QueueStatus} />
      <HomeStackNav.Screen name="profile" component={Profile} />
      <HomeStackNav.Screen name="login" component={Login} />
      <HomeStackNav.Screen name="signUp" component={SignUp} />
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
        tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          // soma o inset inferior do device para a barra nao ficar sob os botoes do sistema
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          ...tabBarShadow,
        },
      }}
    >
      <Tab.Screen
        name="homeTab"
        component={HomeStack}
        options={{
          tabBarLabel: "Início",
          tabBarIcon: ({ focused, color }) => (
            <TabPill focused={focused}>
              <House size={24} color={color} weight={focused ? "fill" : "regular"} />
            </TabPill>
          ),
        }}
      />
      <Tab.Screen
        name="atendimentosTab"
        component={AttendancesStack}
        options={{
          tabBarLabel: "Atendimentos",
          tabBarIcon: ({ focused, color }) => (
            <TabPill focused={focused}>
              <ClipboardText size={24} color={color} weight={focused ? "fill" : "regular"} />
            </TabPill>
          ),
        }}
      />
      <Tab.Screen
        name="settingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: "Config.",
          tabBarIcon: ({ focused, color }) => (
            <TabPill focused={focused}>
              <Gear size={24} color={color} weight={focused ? "fill" : "regular"} />
            </TabPill>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
