import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { VStack, HStack, Text, Box, Center, ScrollView } from "@gluestack-ui/themed";

import { ScreenHeader } from "@components/ScreenHeader";
import { regraDaMulta } from "@domain/queue/saidaDaFila";
import { fs } from "@stores/fonteStore";

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

// paginas-legais (Evolucao, Degrau 1, 08/10): a mesma politica e publicada na
// web em /privacidade, a URL que a Play Store pede. Vale para os dois apps.
// Respostas do Andre (08/10): pessoa fisica responde; ninguem recebe pedido por
// e-mail — o titular resolve no app ou no /excluir-conta; retencao pelas boas
// praticas (backup 35 dias; registros de acesso "pelo tempo exigido em lei" ate
// o registro-de-acesso existir). RASCUNHO: falta a revisao do Andre.
//
// empresa-nas-paginas-legais (CLI-13, Andre 09/10): o responsavel e a empresa Os
// Paulo's, nao o nome do Andre. Ainda nao ha CNPJ: sai sem numero.
export const CONTROLADOR = "a empresa Os Paulo's";
export const CONTATO_LEGAL = "andrericao49@gmail.com";

const PRIVACIDADE: Secao[] = [
  {
    titulo: "1. Quem somos",
    corpo: `A Vupth é mantida por ${CONTROLADOR}, responsável pelos seus dados. Esta política vale para o app do cliente e para o app do profissional (VUPTH Parceiros). Contato: ${CONTATO_LEGAL}.`,
  },
  {
    titulo: "2. O que coletamos",
    corpo:
      "E-mail e senha para a sua conta; nome, telefone e endereço quando você preenche; e sua localização, se autorizar, para mostrar os lugares mais perto. Do profissional, também a foto, os serviços e os horários que ele cadastra.",
  },
  {
    titulo: "3. Para que usamos",
    corpo:
      "Para colocar você na fila, avisar quando for sua vez e mostrar seu histórico de atendimentos. Não vendemos seus dados.",
  },
  {
    titulo: "4. O que o estabelecimento vê",
    corpo:
      "O profissional que vai te atender vê seu nome e os serviços escolhidos — é o que ele precisa para te atender.",
  },
  {
    titulo: "5. Com quem compartilhamos",
    corpo:
      "Só com os serviços que fazem o app funcionar: a hospedagem do servidor e do banco de dados, o envio de notificações (Google Firebase e Expo) e o envio de e-mails, como o código de recuperação de senha.",
  },
  {
    titulo: "6. Notificações",
    corpo:
      "Se você autorizar, enviamos avisos sobre a sua vez na fila. Você pode desligar a qualquer momento nas configurações do celular.",
  },
  {
    titulo: "7. Por quanto tempo guardamos",
    corpo:
      "Enquanto a sua conta existir. Ao excluir a conta, seus dados pessoais são apagados; os atendimentos que você já fez continuam no histórico do profissional, como \"usuário removido\". As cópias de segurança são apagadas em até 35 dias, e uma restauração não traz de volta quem excluiu a conta. Os registros de acesso (data, hora e IP) ficam pelo tempo exigido em lei (Marco Civil da Internet, art. 15). Dados de pagamento, quando houver, ficam pelo prazo fiscal de 5 anos, só o necessário.",
  },
  {
    titulo: "8. Seus direitos",
    corpo:
      "Pela LGPD, você pode ver, corrigir e apagar seus dados, sem pedir a ninguém: corrija no app (Perfil) e exclua a conta quando quiser, pelo app ou pela web (vupth.pages.dev/excluir-conta). Quem confirma é você, com o e-mail cadastrado na conta e a sua senha.",
  },
];

export function Terms({ abaInicial = "uso" }: { abaInicial?: Aba }) {
  const [aba, setAba] = useState<Aba>(abaInicial);
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
                bg={ativa ? "$selecionado" : "$brandSurface"}
                borderRadius="$full"
                py={11}
                px={16}
              >
                <Text
                  fontFamily="$heading"
                  fontSize={fs(14)}
                  color={ativa ? "$onSelecionado" : "$brandTextSecondary"}
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
            <Text fontFamily="$heading" fontSize={fs(15)} color="$brandTextPrimary">
              {s.titulo}
            </Text>
            <Text size="xs" color="$brandTextSecondary" lineHeight={fs(20)}>
              {s.corpo}
            </Text>
          </VStack>
        ))}
        <Text fontFamily="$mono" fontSize={fs(11)} color="$brandTextSecondary" mt="$2">
          Rascunho de 8 de outubro de 2026
        </Text>
      </VStack>
    </ScrollView>
  );
}

/** /privacidade na web (paginas-legais): a mesma tela, ja na aba Privacidade. */
export function Privacy() {
  return <Terms abaInicial="privacidade" />;
}
