import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { VStack, HStack, Text, Box, Center, ScrollView } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
import { regraDaMulta } from "@domain/queue/saidaDaFila";

type Aba = "uso" | "privacidade";

type Secao = { titulo: string; corpo: string };

/**
 * ⚠️ TEXTO JURIDICO — nao e copy de produto.
 *
 * O conteudo abaixo veio do desenho (Pencil CLIENT · 15) e serve de ESTRUTURA.
 * Antes de publicar nas lojas, precisa passar por quem responde juridicamente
 * pelo produto: termos e politica de privacidade tem exigencia legal (LGPD,
 * politicas da App Store e da Play Store) que nao se resolve no design.
 *
 * Nao mexer no texto por motivo de estilo — encurtar clausula por concisao
 * troca um problema (texto longo) por outro pior (garantia incompleta).
 */
const TERMOS: Secao[] = [
  {
    titulo: "1. Aceitação",
    corpo:
      "Ao usar a Vupth você concorda com estes termos. Se não concordar, não utilize o aplicativo.",
  },
  {
    titulo: "2. O serviço",
    corpo:
      "A Vupth conecta clientes a barbearias, salões e estúdios de beleza, permitindo entrar em filas de atendimento de forma remota.",
  },
  {
    titulo: "3. Sua conta",
    corpo:
      "Você é responsável por manter seus dados corretos e pela segurança da sua senha.",
  },
  {
    titulo: "4. Uso da fila",
    corpo:
      "A posição na fila é gerenciada pelo estabelecimento. A Vupth não garante horários e não se responsabiliza por atrasos ou cancelamentos.",
  },
  {
    titulo: "5. Cancelamento",
    // A multa entrou em 25/09 (exigencia do CDC: a regra dita antes). O texto
    // vem de `regraDaMulta`, o mesmo do resumo antes de entrar na fila.
    // ⚠️ Como o resto desta tela, precisa da revisao juridica antes das lojas.
    corpo: `Você pode sair da fila ou excluir sua conta a qualquer momento pelo aplicativo. ${regraDaMulta()}`,
  },
];

const PRIVACIDADE: Secao[] = [
  {
    titulo: "1. O que coletamos",
    corpo:
      "E-mail e senha para a sua conta; nome, telefone e endereço quando você preenche; e sua localização, se autorizar, para mostrar os lugares mais perto.",
  },
  {
    titulo: "2. Para que usamos",
    corpo:
      "Para colocar você na fila, avisar quando for sua vez e mostrar seu histórico de atendimentos. Não vendemos seus dados.",
  },
  {
    titulo: "3. O que o estabelecimento vê",
    corpo:
      "O profissional que vai te atender vê seu nome e os serviços escolhidos — é o que ele precisa para te atender.",
  },
  {
    titulo: "4. Notificações",
    corpo:
      "Se você autorizar, enviamos avisos sobre a sua vez na fila. Você pode desligar a qualquer momento nas configurações do celular.",
  },
  {
    titulo: "5. Seus direitos",
    corpo:
      "Você pode corrigir seus dados no app e apagar sua conta quando quiser — apagar a conta remove seus dados pessoais.",
  },
];

export function Terms() {
  const [aba, setAba] = useState<Aba>("uso");
  const secoes = aba === "uso" ? TERMOS : PRIVACIDADE;

  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Box px={16}>
        <ScreenHeader title="Termos e Privacidade" />
      </Box>

      <HStack px={16} gap="$2">
        {(
          [
            ["uso", "Termos de Uso"],
            ["privacidade", "Privacidade"],
          ] as [Aba, string][]
        ).map(([key, label]) => {
          const ativa = aba === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setAba(key)}
              style={{ flex: 1 }}
              testID={`tab-${key}`}
            >
              <Center
                bg={ativa ? "$forest" : "$brandSurface"}
                borderRadius="$full"
                py={11}
                px={16}
              >
                <Text
                  fontFamily="$heading"
                  fontSize={18}
                  color={ativa ? "$brandGreen" : "$brandTextSecondary"}
                >
                  {label}
                </Text>
              </Center>
            </TouchableOpacity>
          );
        })}
      </HStack>

      <VStack px={16} pt={24} gap="$4.5">
        {secoes.map((s) => (
          <VStack key={s.titulo} gap="$1.5">
            <Text fontFamily="$heading" fontSize={19} color="$brandTextPrimary">
              {s.titulo}
            </Text>
            <Text size="xs" color="$brandTextSecondary" lineHeight={24}>
              {s.corpo}
            </Text>
          </VStack>
        ))}
        <Text fontFamily="$mono" fontSize={15} color="$brandTextSecondary" mt="$2">
          Atualizado em 21 de agosto de 2026
        </Text>
      </VStack>
    </ScrollView>
  );
}
