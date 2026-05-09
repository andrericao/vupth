import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { Home } from "@screens/Home";
import { EstablishmentDetail } from "@screens/EstablishmentDetail";
import { Login } from "@screens/Login";
import { SignUp } from "@screens/SignUp";
import { QueueStatus } from "@screens/QueueStatus";

export type AppRoutes = {
  home: undefined;
  establishmentDetail: { establishmentId: string };
  login: { redirectTo?: string; establishmentId?: string; professionalId?: string };
  signUp: { redirectTo?: string; establishmentId?: string; professionalId?: string };
  queueStatus: { professionalId: string; establishmentId: string };
};

export type AppNavigatorRoutesProps = NativeStackNavigationProp<AppRoutes>;

const { Navigator, Screen } = createNativeStackNavigator<AppRoutes>();

export function AuthRoutes() {
  return (
    <Navigator screenOptions={{ headerShown: false }}>
      <Screen name="home" component={Home} />
      <Screen name="establishmentDetail" component={EstablishmentDetail} />
      <Screen name="login" component={Login} />
      <Screen name="signUp" component={SignUp} />
      <Screen name="queueStatus" component={QueueStatus} />
    </Navigator>
  );
}
