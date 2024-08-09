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
  return (
    <Center flexDirection="row">
      {
      showBackButton && (
        <Link flex={1} href="#">
          <TouchableOpacity>
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
