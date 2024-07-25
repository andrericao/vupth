import { Input as NB_Input, Box, Center } from "native-base";

export function Input() {
  return (
    <Center flex={1}>
      <Box px={3}>
        <NB_Input 
				width="100%" 
				bg="gray.700"
				h={60}
				px={4}
				size="md"
				borderWidth={0}
				color="light.300"
				fontFamily="body"
				placeholder="pesquise loja ou serviço"
				_focus={{
					bg: "gray.700",
					borderWidth: 2,
					borderColor: "green.500"
				}}
				/>
      </Box>
    </Center>
  );
}
