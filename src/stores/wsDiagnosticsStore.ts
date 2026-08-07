import { create } from 'zustand';

import {
  ConnectInfo,
  WsChannel,
  WsStatus,
  parseConnectHeaders,
} from '@domain/ws/diagnostics';

/**
 * Estado do WebSocket para o painel de diagnóstico das Configurações.
 *
 * Existe porque o "Teste 0" do backend (imprimir os headers do CONNECTED) é
 * invisível num binário instalado — só apareceria via `adb logcat` ou dev
 * client. Sem enxergar o CONNECTED, todo teste de WS vira discussão.
 *
 * NÃO é persistido: é retrato do momento, e um valor velho de sessão anterior
 * enganaria mais do que ajudaria.
 */

export type ChannelState = {
  status: WsStatus;
  info: ConnectInfo | null;
  /** Quantas vezes o canal completou o CONNECT (1 = nunca reconectou). */
  connects: number;
  connectedAt: number | null;
  lastMessageAt: number | null;
  /** Mensagens recebidas na sessão — separa "conectado" de "recebendo". */
  messages: number;
};

const EMPTY: ChannelState = {
  status: 'idle',
  info: null,
  connects: 0,
  connectedAt: null,
  lastMessageAt: null,
  messages: 0,
};

interface WsDiagnosticsState {
  public: ChannelState;
  personal: ChannelState;
  markConnecting: (channel: WsChannel) => void;
  markConnected: (channel: WsChannel, headers: Record<string, string>) => void;
  markMessage: (channel: WsChannel) => void;
  markError: (channel: WsChannel) => void;
  markClosed: (channel: WsChannel) => void;
  reset: () => void;
}

export const useWsDiagnosticsStore = create<WsDiagnosticsState>((set) => ({
  public: { ...EMPTY },
  personal: { ...EMPTY },

  markConnecting: (channel) =>
    set((s) => ({ [channel]: { ...s[channel], status: 'connecting' } })),

  markConnected: (channel, headers) =>
    set((s) => ({
      [channel]: {
        ...s[channel],
        status: 'connected',
        info: parseConnectHeaders(headers),
        connects: s[channel].connects + 1,
        connectedAt: Date.now(),
      },
    })),

  markMessage: (channel) =>
    set((s) => ({
      [channel]: {
        ...s[channel],
        lastMessageAt: Date.now(),
        messages: s[channel].messages + 1,
      },
    })),

  markError: (channel) =>
    set((s) => ({ [channel]: { ...s[channel], status: 'error' } })),

  markClosed: (channel) =>
    set((s) => ({ [channel]: { ...s[channel], status: 'idle' } })),

  reset: () => set({ public: { ...EMPTY }, personal: { ...EMPTY } }),
}));
