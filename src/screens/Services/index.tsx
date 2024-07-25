import { Center, Container, Flex } from "native-base";

import { CardService } from "@components/CardService";

import { Input } from "@components/Input";

export function Services() {
  return (
    <>
      <Input />
      <Center flex={3}>
        <Container>
          <Flex
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="space-around"
          >
            <CardService />
            <CardService />
            <CardService />
            <CardService />
          </Flex>
        </Container>
      </Center>
    </>
  );
}
