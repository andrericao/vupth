import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

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

export type AppRoutes = {
  home: undefined;
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
    professionalName: string;
    establishmentId: string;
    establishmentName: string;
    estimatedWaitMinutes: number;
    serviceItemIds: string[];
  };
  profile: undefined;
  attendances: undefined;
  settings: undefined;
  editProfile: undefined;
  editEmail: undefined;
  editPassword: undefined;
  editAddress: undefined;
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
      <Screen name="serviceSelection" component={ServiceSelection} />
      <Screen name="queueStatus" component={QueueStatus} />
      <Screen name="profile" component={Profile} />
      <Screen name="attendances" component={Attendances} />
      <Screen name="settings" component={Settings} />
      <Screen name="editProfile" component={EditProfile} />
      <Screen name="editEmail" component={EditEmail} />
      <Screen name="editPassword" component={EditPassword} />
      <Screen name="editAddress" component={EditAddress} />
    </Navigator>
  );
}
