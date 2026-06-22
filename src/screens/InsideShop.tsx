import { useMemo, useState } from "react";
import { ImageSourcePropType } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Question } from "phosphor-react-native";

import {
  Button as ModalButton,
  ModalContent,
  VStack,
  Heading,
  Box,
  Text,
  Center,
  Link,
  ModalBody,
  ModalFooter,
  ButtonText,
  Modal,
  ModalCloseButton,
  ModalBackdrop,
  ModalHeader,
  Icon,
  CloseIcon
} from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { ImageBanner } from "@components/ImageBanner";
import { CardProfProps } from "@components/CardProf";
import { Profs } from "@components/Profs";

import { PROFS } from "@utils/profsData";

type RouteParams = {
  shop: string;
  imageShop: ImageSourcePropType;
};

export function InsideShop() {
  const route = useRoute();
  const { shop, imageShop } = route.params as RouteParams;

  const profs = useMemo(
    () => PROFS.filter((p) => p.shopName === shop) as CardProfProps[],
    [shop],
  );
  const [showModal, setShowModal] = useState(false);

  return (
    <VStack flex={1} px={15} pt={60} pb={45}>
      <ImageBanner data={imageShop} />

      <Heading textAlign="center" fontSize="$4xl" fontFamily="$heading">
        Nome da Loja
      </Heading>
      <Center mt={15}>
        <Text>Tempo Estimado: 01:30</Text>
      </Center>

      <Box
        mt={36}
        px={15}
        flexDirection="row"
        my={15}
        gap={9}
        justifyContent="space-between"
      >
        <Heading fontFamily="$heading">Funcionários {profs.length}</Heading>
        <Heading fontFamily="$heading">Filtrar </Heading>
      </Box>

      <Profs data={profs} />
      <Box flexDirection="row" justifyContent="flex-end" pb={6} pr={12}>
        <Link onPress={() => setShowModal(true)}>
          <Question color="#00B37E" size={21} />
        </Link>
      </Box>
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
        }}
        size="md"
      >
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="xl">
              Fila sem preferência:
            </Heading>
            <ModalCloseButton>
              <Icon
                as={CloseIcon}
                size="xl"
              />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <Text size="xl">
              Você será adicionado(a) à fila do funcionário com menor tempo estimado de espera!
            </Text>
            <Text> </Text>
            <Text size="md">OBS: É tempo descrito abaixo do nome da loja</Text>
          </ModalBody>
          <ModalFooter gap={15}>
            <ModalButton
              variant="outline"
              action="negative"
              onPress={() => {
                setShowModal(false);
              }}
            >
              <ButtonText>Cancelar</ButtonText>
            </ModalButton>
            <ModalButton
            bg="$green500"
              onPress={() => {
                setShowModal(false);
              }}
            >
              <ButtonText>Entrar na Fila</ButtonText>
            </ModalButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Button title="Entrar na fila sem preferência" />
    </VStack>
  );
}
