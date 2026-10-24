import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

import {
  acquireExpoPushToken,
  atendimentoParaAvaliar,
  atendimentoParaPagarDeNovo,
  avisoDoPush,
  ACAO_OK,
  CANAL_ALERTAS,
  CATEGORIA_CIENCIA,
  CATEGORIAS_COM_BOTAO,
  mapPlatform,
  notificationRoute,
  registrarComRetentativa,
  tocouNoOk,
} from "@domain/push";
import { pushService } from "@services/pushService";
import { oferecerVezAdiantada } from "@utils/vezAdiantada";
import { confirmarTrocaPeloPush } from "@utils/trocaPeloPush";
import { ACAO_AGORA_NAO, ACAO_CONFIRMAR, CATEGORIA_TROCA } from "@domain/trocaPeloPush";
import { abrirAvaliacao, navigateFromNotification } from "@routes/navigationRef";
import { useAuthStore } from "@stores/authStore";
import { usePendenciaStore } from "@stores/pendenciaStore";
import { useFirstRunStore } from "@stores/firstRunStore";
import { PUSH_PERGUNTADO_KEY } from "@hooks/ofertaDePush";
import { usePushDiagnosticsStore } from "@stores/pushDiagnosticsStore";

// Chave onde o Expo Push Token registrado é guardado, p/ o logout desregistrar
// (authStore.logout → DELETE /devices). Mesmo valor do authStore.
const PUSH_TOKEN_KEY = "vupth_push_token";
// A chave "a caixa do sistema ja apareceu" e a tela 10 moram em ofertaDePush.

// Push em foreground: banner/lista/som (o WS já cobre a UI in-app; o banner
// reforça). Registrado uma vez no módulo.
//
// ⚠️ RESILIÊNCIA OTA: este arquivo pode carregar num binário SEM o módulo nativo
// (ex.: OTA novo — que já tem este código — rodando sobre um APK antigo, buildado
// antes do expo-notifications). Sem guarda, a chamada nativa lança no eval do
// módulo e o app inteiro cai (rollback pro bundle embutido velho). O try/catch
// deixa o resto do app (JS) rodar; push só funciona num build COM o módulo.
try {
  Notifications.setNotificationHandler({
    // Com o app aberto o push vira aviso com "OK" (listener abaixo): o banner
    // sairia junto e diria a mesma coisa duas vezes.
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // binário sem o módulo nativo de push — segue sem handler.
}

/**
 * Registra o device para push quando o cliente está autenticado (POST /devices)
 * e trata o toque na notificação. Best-effort: nenhuma falha de push quebra o app.
 */
export function usePushRegistration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const didRegister = useRef(false);
  const registrarTentativa = usePushDiagnosticsStore((s) => s.registrarTentativa);
  const registrarEnvio = usePushDiagnosticsStore((s) => s.registrarEnvio);
  // A caixa do sistema so vem depois da tela 10 (ligar-push-permission): antes
  // dela, quem nunca respondeu fica sem token — o efeito roda de novo quando a
  // tela e respondida.
  const pushAsked = useFirstRunStore((s) => s.pushAsked);

  // Android exige um canal para exibir notificações.
  useEffect(() => {
    if (Platform.OS === "android") {
      try {
        // HIGH (Andre, 02/10): aparece no topo na hora, sem esperar. O Backend
        // manda o push com prioridade alta; o canal precisa acompanhar.
        Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
        }).catch(() => {});
        // ⚠️ O Android NAO muda a importancia de um canal que ja existe: quem
        // instalou antes segue com o "default" em DEFAULT. O canal "alertas"
        // nasce HIGH em todo aparelho — o Backend passa a mandar channelId "alertas".
        Notifications.setNotificationChannelAsync(CANAL_ALERTAS, {
          name: "Avisos",
          importance: Notifications.AndroidImportance.HIGH,
        }).catch(() => {});
      } catch {
        // binário sem o módulo nativo de push.
      }
    }
  }, []);

  // O botao "OK" na propria notificacao (app fechado): so fecha, nao abre o app.
  // Aparece quando o push vem com categoryId "CIENCIA" (Backend).
  useEffect(() => {
    try {
      Notifications.setNotificationCategoryAsync(CATEGORIA_CIENCIA, [
        { identifier: ACAO_OK, buttonTitle: "OK", options: { opensAppToForeground: false } },
      ]).catch(() => {});
      // Os botoes que abrem a tela: o toque neles cai no mesmo `tratar` do
      // corpo (nao e o OK), que navega pelo data.type.
      // A troca (troca-pela-notificacao): CONFIRMAR abre o app e aceita;
      // AGORA NAO so fecha.
      Notifications.setNotificationCategoryAsync(CATEGORIA_TROCA, [
        { identifier: ACAO_CONFIRMAR, buttonTitle: "CONFIRMAR", options: { opensAppToForeground: true } },
        { identifier: ACAO_AGORA_NAO, buttonTitle: "AGORA NÃO", options: { opensAppToForeground: false } },
      ]).catch(() => {});
      for (const c of CATEGORIAS_COM_BOTAO) {
        Notifications.setNotificationCategoryAsync(c.categoria, [
          { identifier: c.acao, buttonTitle: c.titulo, options: { opensAppToForeground: true } },
        ]).catch(() => {});
      }
    } catch {
      // binário sem o módulo nativo de push.
    }
  }, []);

  // Aquisição de token + POST /devices (uma vez por sessão autenticada).
  useEffect(() => {
    if (!isAuthenticated || !accessToken || didRegister.current) return;
    let cancelled = false;
    // A espera entre tentativas precisa morrer junto com a sessão: um timer de
    // 25s solto depois do logout seguraria o processo e dispararia um POST com
    // o token velho.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let acordar: (() => void) | undefined;
    const esperar = (ms: number) =>
      new Promise<void>((resolve) => {
        acordar = resolve;
        timer = setTimeout(resolve, ms);
      });

    (async () => {
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

        const { token, motivo, detalhe } = await acquireExpoPushToken({
          isDevice: Device.isDevice,
          getPermissionsAsync: Notifications.getPermissionsAsync,
          requestPermissionsAsync: Notifications.requestPermissionsAsync,
          jaPerguntou: async () =>
            !pushAsked || (await SecureStore.getItemAsync(PUSH_PERGUNTADO_KEY)) === "1",
          marcarPerguntado: () => SecureStore.setItemAsync(PUSH_PERGUNTADO_KEY, "1"),
          getExpoPushTokenAsync: Notifications.getExpoPushTokenAsync,
          projectId,
        });
        // Grava SEMPRE, inclusive o fracasso: o painel das Configurações e o
        // QA dependem disto para separar "nao chegou push" de "nem tentamos".
        registrarTentativa({ motivo, detalhe, token });
        if (!token || cancelled) return;

        try {
          // Com novas tentativas: logo depois do login o Render pode estar
          // hibernando, e uma chamada so deixava o aparelho sem push ate o
          // proximo login (teste de 15/09).
          const desfecho = await registrarComRetentativa({
            enviar: () => pushService.registerDevice(token, mapPlatform(Platform.OS), accessToken),
            esperar,
            cancelado: () => cancelled,
            aoTentarDeNovo: (tentativa, e) =>
              registrarEnvio("tentando", `tentativa ${tentativa} — ${(e as Error)?.message ?? String(e)}`),
          });
          if (desfecho === "cancelado") return;
          registrarEnvio("ok");
        } catch (e) {
          // Token adquirido mas o backend nao ficou sabendo: o push nunca vai
          // chegar, e o sintoma e identico ao de nao ter token.
          registrarEnvio("falhou", (e as Error)?.message ?? String(e));
          throw e;
        }
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
        didRegister.current = true;
      } catch {
        // best-effort — push nunca deve derrubar o fluxo de login. O motivo já
        // ficou no store acima.
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      acordar?.();
    };
  }, [isAuthenticated, accessToken, pushAsked, registrarTentativa, registrarEnvio]);

  // Ao deslogar, permitir novo registro na próxima sessão.
  useEffect(() => {
    if (!isAuthenticated) didRegister.current = false;
  }, [isAuthenticated]);

  // Push com o app aberto → aviso com "OK" (Andre, 26/09).
  useEffect(() => {
    try {
      const sub = Notifications.addNotificationReceivedListener((notificacao) => {
        const conteudo = notificacao.request.content;
        // A vez adiantou: a pergunta com "Topo", e nao um aviso com OK.
        const dados = (conteudo.data ?? {}) as { type?: string; attendanceId?: string };
        if (dados.type === "EARLIER_TURN_OFFERED" && dados.attendanceId) {
          oferecerVezAdiantada(dados.attendanceId, conteudo.body ?? "");
          return;
        }
        const aviso = avisoDoPush(conteudo);
        // pagamento-ja-paguei: o profissional recusou o "Já paguei"; o aviso leva ao pagamento.
        const pagarDeNovo = atendimentoParaPagarDeNovo(dados);
        if (aviso && pagarDeNovo) {
          Alert.alert(aviso.titulo, aviso.mensagem, [
            { text: "Agora não", style: "cancel" },
            { text: "Pagar", onPress: () => usePendenciaStore.getState().pagar(pagarDeNovo, true) },
          ]);
          return;
        }
        if (aviso) Alert.alert(aviso.titulo, aviso.mensagem, [{ text: "OK" }]);
      });
      return () => sub.remove();
    } catch {
      // binário sem o módulo nativo de push — sem aviso.
    }
  }, []);

  // Toque na notificação → navega conforme o data.type.
  useEffect(() => {
    // O mesmo toque pode chegar pelos dois caminhos (o listener e a ultima
    // resposta da abertura): navega uma vez so.
    const tratadas = new Set<string>();
    const tratar = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (tratadas.has(id)) return;
      tratadas.add(id);
      // "OK" e "AGORA NÃO" só fecham a notificação — não navegam.
      if (tocouNoOk(response) || response.actionIdentifier === ACAO_AGORA_NAO) {
        Notifications.dismissNotificationAsync(id).catch(() => {});
        return;
      }
      const data = response.notification.request.content.data;
      // CONFIRMAR da troca: abre a fila e aceita dali.
      if (response.actionIdentifier === ACAO_CONFIRMAR) {
        Notifications.dismissNotificationAsync(id).catch(() => {});
        navigateFromNotification("fila");
        void confirmarTrocaPeloPush(data);
        return;
      }
      // Concluido (notificacao-avaliar): o toque abre a avaliacao dele.
      // PAYMENT_REFUSED (categoria PAGAR): o toque, no corpo ou no "Pagar", abre o pagamento pendente.
      const pagarDeNovo = atendimentoParaPagarDeNovo(data);
      if (pagarDeNovo) {
        Notifications.dismissNotificationAsync(id).catch(() => {});
        usePendenciaStore.getState().pagar(pagarDeNovo, true);
        return;
      }
      const avaliar = atendimentoParaAvaliar(data);
      if (avaliar) {
        abrirAvaliacao(avaliar);
        return;
      }
      navigateFromNotification(notificationRoute(data));
    };
    try {
      const sub = Notifications.addNotificationResponseReceivedListener(tratar);
      // Com o app FECHADO, o toque que o abriu nao passa pelo listener (ele
      // ainda nao existia): vem na ultima resposta (Andre, 05/10 — abria a Home).
      Notifications.getLastNotificationResponseAsync()
        .then((ultima) => { if (ultima) tratar(ultima); })
        .catch(() => {});
      return () => sub.remove();
    } catch {
      // binário sem o módulo nativo de push — sem listener de toque.
    }
  }, []);
}
