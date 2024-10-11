import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import { Services } from "@screens/Services";
import { ListShops } from "@screens/ListShops";
import { InsideShop } from "@screens/InsideShop";
import { Login } from "@screens/Login";
import { SingUp } from "@screens/SingUp";

type AuthRoutes = {
  insideShop: undefined;
  listShops: undefined;
  services: undefined;
  login: undefined;
  singUp: undefined;
};

export type AuthNavigatorRoutesProps = NativeStackNavigationProp<AuthRoutes>;

const { Navigator, Screen } = createNativeStackNavigator<AuthRoutes>();

export function AuthRoutes() {
  return (
    <Navigator screenOptions={{ headerShown: false }}>
      
      <Screen name="login" component={Login} />

      <Screen name="singUp" component={SingUp} />

      <Screen name="services" component={Services} />

      <Screen name="insideShop" component={InsideShop} />

      <Screen name="listShops" component={ListShops} />

    </Navigator>
  );
}
