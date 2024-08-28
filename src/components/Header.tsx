
import { useNavigation } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";

import {
  Link,
  Icon,
  ChevronLeftIcon,
  Center,
} from "@gluestack-ui/themed";

import Logo from "@assets/vupth-logo/people-waiting.svg";

type Props = {
  showBackButton?: boolean;
};

export function Header({ showBackButton = false }: Props) {

  const navigation = useNavigation();

  function handleGoBack(){
    navigation.goBack();
  }

  return (
    <Center flexDirection="row">
      {
      showBackButton && (
        <Link flex={1}>
          <TouchableOpacity onPress={handleGoBack}>
            <Icon as={ChevronLeftIcon} size="xl" />
          </TouchableOpacity>
        </Link>
      )}
      <TouchableOpacity>
        <Logo width={50} height={50} />
      </TouchableOpacity>
    </Center>
  );
}
