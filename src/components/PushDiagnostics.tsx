import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";

import { usePushDiagnosticsStore } from "@stores/pushDiagnosticsStore";
import { MotivoPush } from "@domain/push";

// Painel de diagnóstico do PUSH, irmão do WsDiagnostics e pelo mesmo motivo:
// num binário instalado nada disto é visível, e o registro inteiro vive dentro
// de um `catch {}` best-effort — certo (push não pode derrubar o login) e ao
// mesmo tempo apagador de rastro.
//
// O relato de 2026-09-07 foi "não recebi nenhuma notificação, de input nenhum",
// nos DOIS apps. Sem esta tela, esse relato é indistinguível de: emulador,
// permissão negada, projectId ausente, credencial de push não configurada no
// projeto, backend não enviando, ou token nunca entregue ao backend.
//
// A ordem das linhas é a ordem em que as coisas falham. Leia de cima pra baixo:
// a primeira que não estiver OK é onde parou.

const EXPLICACAO: Record<MotivoPush, string> = {
  'ok': "token obtido",
  'emulador': "emulador ou web — push remoto não existe aqui",
  'sem-permissao': "permissão NEGADA no aparelho",
  'sem-project-id': "projectId ausente — o Expo não sabe pra qual projeto emitir",
  'sem-token': "o Expo respondeu sem token",
  'erro': "a chamada nativa falhou (ver detalhe)",
};

function Linha({ rotulo, valor, ok }: { rotulo: string; valor: string; ok: boolean | null }) {
  return (
    <HStack justifyContent="space-between" alignItems="center" gap="$2">
      <Text fontFamily="$body" fontSize="$sm" color="$brandTextSecondary">
        {rotulo}
      </Text>
      <Text
        fontFamily="$mono"
        fontSize="$sm"
        color={ok === null ? "$brandTextSecondary" : ok ? "$forest" : "$brandDanger"}
        flexShrink={1}
        textAlign="right"
      >
        {valor}
      </Text>
    </HStack>
  );
}

export function PushDiagnostics() {
  const { motivo, detalhe, tokenSufixo, token, envio, erroEnvio } = usePushDiagnosticsStore();
  const [mostrarToken, setMostrarToken] = useState(false);

  return (
    <Box bg="$brandSurface" borderRadius="$lg" p="$3" mt="$3">
      <VStack gap="$2">
        <Heading fontFamily="$heading" fontSize="$sm" color="$forest">
          Push
        </Heading>

        {motivo === null ? (
          // Estado que mais engana: sem tentativa nenhuma o painel ficaria vazio
          // e pareceria "tudo certo". O registro só roda depois de autenticar.
          <Text fontFamily="$body" fontSize="$sm" color="$brandTextSecondary">
            Ainda não tentou registrar — o registro acontece depois do login.
          </Text>
        ) : (
          <>
            <Linha rotulo="token" valor={EXPLICACAO[motivo]} ok={motivo === "ok"} />
            {tokenSufixo && (
              <TouchableOpacity onPress={() => setMostrarToken((v) => !v)}>
                <Linha
                  rotulo="fim do token"
                  valor={mostrarToken ? "toque p/ esconder" : `…${tokenSufixo} · toque p/ ver`}
                  ok
                />
              </TouchableOpacity>
            )}
            {mostrarToken && token && (
              // Token INTEIRO, selecionavel. Existe para o diagnostico manual:
              // com ele da pra mandar um push pela ferramenta do Expo e separar
              // "o backend nao envia" de "o Expo nao entrega" — hoje as duas
              // hipoteses estao empatadas.
              //
              // `selectable` em vez de botao de copiar: copiar exigiria
              // `expo-clipboard`, que e modulo NATIVO — entraria so com build
              // novo, e a graca disto e chegar por OTA no APK que ja esta
              // instalado. Segurar o texto abre o menu de copiar do sistema.
              <Box bg="$white" borderRadius="$sm" p="$2">
                <Text selectable fontFamily="$mono" fontSize="$xs" color="$forest">
                  {token}
                </Text>
              </Box>
            )}
            {detalhe && <Linha rotulo="detalhe" valor={detalhe} ok={false} />}
            <Linha
              rotulo="backend sabe?"
              valor={
                envio === "ok"
                  ? "sim (POST /devices)"
                  : envio === "falhou"
                    ? "NÃO — envio falhou"
                    : envio === "tentando"
                      ? "tentando de novo — servidor acordando"
                      : "não tentado"
              }
              ok={envio === "ok" ? true : envio === "falhou" ? false : null}
            />
            {erroEnvio && (
              <Linha
                rotulo={envio === "tentando" ? "última falha" : "erro do envio"}
                valor={erroEnvio}
                ok={envio === "tentando" ? null : false}
              />
            )}
          </>
        )}

        <Text fontFamily="$body" fontSize="$xs" color="$brandTextSecondary">
          Tudo OK aqui e ainda assim nada chega = o problema está no envio (backend) ou na
          credencial de push do projeto, que este aparelho não consegue ver.
        </Text>
      </VStack>
    </Box>
  );
}
