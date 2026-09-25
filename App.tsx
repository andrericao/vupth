import { useEffect, useState } from "react";
import { Alert, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";

import { useFonts } from "expo-font";

// Os TTFs vivem em `assets/fonts/`, NAO em `@expo-google-fonts/*`. O motivo e
// o build web: o `expo export --platform web` grava cada asset espelhando o
// caminho de origem, entao importar do pacote faz os arquivos sairem em
// `dist/assets/node_modules/@expo-google-fonts/...` — e a Cloudflare Pages
// DESCARTA `node_modules` do deploy, por design, sem avisar.
//
// O sintoma e traicoeiro: com o fallback de SPA o arquivo ausente responde
// 200, so que devolvendo o index.html. Quem testa por status code ve verde.
// O que distingue e o `content-type` (`text/html` em vez de `font/ttf`).
// Achado pelo front-partner em 2026-08-29 e confirmado no nosso deploy.
//
// De brinde, importar so os arquivos que usamos derruba o export de 42 fontes
// (o pacote inteiro do @expo-google-fonts entrava) para 6.
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { instalarDialogoNativo } from "@utils/alertNativo";
import { DialogoVupth } from "@components/DialogoVupth";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { config } from "./config/gluestack-ui.config";

import { Routes } from "@routes/index";

import { Loading } from "@components/Loading";
import { PreparingServer } from "@components/PreparingServer";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";
import { useRatedStore } from "@stores/ratedStore";
import { useCienciaStore } from "@stores/cienciaStore";
import { usePendingSwapStore } from "@stores/pendingSwapStore";
import { useFavoritesStore } from "@stores/favoritesStore";
import { useComingSoonStore } from "@stores/comingSoonStore";
import { useLocationStore } from "@stores/locationStore";
import { useFirstRunStore } from "@stores/firstRunStore";
import { useQueueNotifications } from "@hooks/useQueueNotifications";
import { usePushRegistration } from "@hooks/usePushRegistration";
import { useOutOfQueueSwap } from "@hooks/useOutOfQueueSwap";
import { usePedidoDeCorte } from "@hooks/usePedidoDeCorte";
import { usePedidoDeCorteStore } from "@stores/pedidoDeCorteStore";
import { useDeviceLocation } from "@hooks/useDeviceLocation";
import { setupOnlineManager } from "@hooks/useNetwork";
import { waitForBackend } from "@services/healthService";

import { useReconciliarFila } from "@hooks/useReconciliarFila";
import { useAvisoDeAtraso } from "@hooks/useAvisoDeAtraso";
import { devePersistir, persister, VALIDADE_MS } from "@services/queryPersist";
import { ErrorBoundary } from "@components/ErrorBoundary";

import { instalarAlertWeb } from "./web-shims/alert";

// Pausa/retoma as queries conforme a conexao real (netinfo). 1x no boot.
setupOnlineManager();

// O React Native Web nao implementa `Alert`: a chamada nao falha, nao loga e
// nao pinta NADA. Eram 60 avisos mudos no navegador — inclusive o motivo de uma
// acao recusada, que e quando o usuario mais precisa de resposta.
//
// O patch troca o metodo no objeto que o react-native exporta, entao pega as 60
// chamadas existentes E as futuras, sem import novo em tela nenhuma. Roda no
// boot, antes de qualquer interacao poder disparar um Alert.
if (Platform.OS === "web") instalarAlertWeb(Alert);

// O cache sobrevive entre aberturas: a ultima lista de lojas pinta na hora e
// revalida atras, em vez de skeleton ate a API responder. Ver
// `services/queryPersist.ts` — inclusive o que NAO e persistido e por que.
//
// `gcTime` precisa ser >= a validade do cache salvo. Com o default (5 min), a
// query restaurada seria descartada da memoria antes de alguem usa-la, e a
// persistencia nao serviria para nada. So controla quanto tempo um cache SEM
// ninguem olhando fica guardado; nao muda quando os dados sao refeitos.
// Exportado so para o smoke de boot limpar o cache no fim: cada query guarda um
// timer de coleta de 24h, e sem o `clear()` o jest nao sai depois dos testes.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { gcTime: VALIDADE_MS } },
});

// Substitui o `Alert.alert` para as ~65 chamadas passarem a desenhar a caixa da
// marca, sem tocar em nenhuma delas. A rede esta no proprio instalador: sem o
// <DialogoVupth /> montado, ele cai no Alert do sistema — feio e visivel e
// melhor que bonito e invisivel.
instalarDialogoNativo();

export default function App() {
  // `fontError` NAO pode ser ignorado. Segurar a tela so no `fontsLoaded`
  // transforma qualquer falha de fonte em spinner eterno — foi exatamente o
  // que derrubou o app publicado do parceiro. Fonte que nao carrega deve
  // degradar para a do sistema, nao prender o app.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require("./assets/fonts/Inter_400Regular.ttf"),
    Inter_500Medium: require("./assets/fonts/Inter_500Medium.ttf"),
    Inter_700Bold: require("./assets/fonts/Inter_700Bold.ttf"),
    Archivo_700Bold: require("./assets/fonts/Archivo_700Bold.ttf"),
    Archivo_800ExtraBold: require("./assets/fonts/Archivo_800ExtraBold.ttf"),
    DMMono_500Medium: require("./assets/fonts/DMMono_500Medium.ttf"),
  });
  const fontGateOpen = fontsLoaded || Boolean(fontError);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const restoreQueue = useQueueStore((s) => s.restoreQueue);
  const restoreRated = useRatedStore((s) => s.restoreRated);
  const restoreCiencia = useCienciaStore((s) => s.restoreCiencia);
  const restoreComingSoon = useComingSoonStore((s) => s.restore);
  const restoreLocation = useLocationStore((s) => s.restoreLocation);
  const restoreFirstRun = useFirstRunStore((s) => s.restoreFirstRun);
  const restorePendingSwap = usePendingSwapStore((s) => s.restorePending);
  const restorePedidosDeCorte = usePedidoDeCorteStore((s) => s.restaurar);
  const restoreFavorites = useFavoritesStore((s) => s.restoreFavorites);
  const activeQueue = useQueueStore((s) => s.activeQueue);
  const [backendReady, setBackendReady] = useState(false);

  useEffect(() => {
    restoreSession();
    restoreQueue();
    restoreRated();
    restoreCiencia();
    restoreComingSoon();
    restoreLocation();
    restorePendingSwap();
    restorePedidosDeCorte();
    restoreFirstRun();
    restoreFavorites();
    // Portao de readiness (cold start do Render): acorda o backend ANTES de liberar
    // login/cadastro/listagem. A 1a cutucada acorda a instancia; segue mesmo se
    // estourar o teto (chamadas seguintes ja pegam a instancia quente). CLAUDE.md 18c.
    let active = true;
    waitForBackend().finally(() => {
      if (active) setBackendReady(true);
    });
    return () => {
      active = false;
    };
  }, [
    restoreSession,
    restoreQueue,
    restoreRated,
    restoreCiencia,
    restoreFavorites,
    restoreComingSoon,
    restoreLocation,
    restorePendingSwap,
    restorePedidosDeCorte,
    restoreFirstRun,
  ]);

  // Notificacao pessoal "é a sua vez" (WebSocket) app-wide: vale em qualquer
  // tela enquanto houver fila ativa, nao so na QueueStatus (item #5, fatia 2).
  useQueueNotifications(!!activeQueue);

  // Se o servidor diz que ha atendimento ativo e o aparelho nao sabe, quem esta
  // errado e o aparelho. Sem isto, quem entrou na fila por ACEITE DE PEDIDO DE
  // CORTE nunca via a propria fila — o estado local so nascia quando o cliente
  // entrava pela tela, e esse caminho nao passa por la.
  useReconciliarFila();

  // Chamado e nao chegou: avisa e espera o toque ("nao podemos agir na
  // surdina", Andre 18/09). Fica aqui, e nao na tela da fila, porque o atraso
  // acontece justamente quando a pessoa nao esta olhando o app.
  useAvisoDeAtraso();

  // Push (background/fechado): registra o device (POST /devices) quando autentica
  // e trata o toque. Best-effort/guardado — inerte ate um build COM o modulo
  // nativo de push (expo-notifications).
  usePushRegistration();

  // GPS (Fase 3): na 1a abertura pede a localizacao e deriva bairro/cidade por
  // reverse geocode, para a Home ja abrir com as lojas perto. Guardado com
  // try/catch — inerte num binario sem expo-location. NAO usa react-query, pode
  // ficar aqui.
  useDeviceLocation();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: VALIDADE_MS,
        // Versao nova do app invalida o cache salvo: se o formato de uma
        // resposta mudar entre versoes, o app nao abre lendo um objeto que nao
        // reconhece.
        buster: Constants.expoConfig?.version ?? "",
        dehydrateOptions: { shouldDehydrateQuery: devePersistir },
      }}
    >
      <GluestackUIProvider config={config}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />

        <QueryScopedHooks />
        {/* Erro de render deixa de fechar o app e vira tela com mensagem. Fica
            DENTRO dos providers de proposito: a tela de erro usa `Button` e os
            tokens da marca, que precisam do Gluestack acima. */}
        <ErrorBoundary>
          {!fontGateOpen ? <Loading /> : !backendReady ? <PreparingServer /> : <Routes />}
        </ErrorBoundary>
        {/* Um so na arvore, FORA do portao de fonte: um aviso disparado antes
            de a fonte carregar precisa aparecer do mesmo jeito. */}
        <DialogoVupth />
      </GluestackUIProvider>
    </PersistQueryClientProvider>
  );
}

// Hooks app-wide que dependem do React Query TEM que rodar DENTRO do
// QueryClientProvider — no corpo do App eles ficam ACIMA do provider e o
// `useQuery` estoura "No QueryClient set" no boot (app fecha / tela branca).
function QueryScopedHooks() {
  // Troca publicada de FORA da fila (F8 fatia 2): sem WS conectado, o aceite
  // chega por poll — entra na fila local e avisa quando alguem ceder.
  useOutOfQueueSwap();
  // Pedido de corte: a resposta chega por poll e o app avisa o desfecho — nem o
  // WebSocket (so com fila ativa) nem o push chegavam a quem so pediu corte.
  usePedidoDeCorte();
  return null;
}
