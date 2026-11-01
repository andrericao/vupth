import { Text } from "react-native";
import { render, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { GluestackUIProvider } from "@gluestack-ui/themed";

import { config } from "../../../config/gluestack-ui.config";
import { ErrorBoundary } from "@components/ErrorBoundary";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";

jest.mock("expo-updates", () => ({ reloadAsync: jest.fn() }));
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn().mockResolvedValue(undefined) }));

// O app nao tinha rede nenhuma contra erro de render: a excecao derrubava o
// processo e o usuario via o app FECHAR SOZINHO, sem mensagem e sem log. Foi o
// relato de 07/09 ao sair da fila.

function Quebra({ quebrar }: { quebrar: boolean }): React.ReactElement {
  if (quebrar) throw new Error("activeQueue is null");
  return <Text>conteudo</Text>;
}

function renderComTema(ui: React.ReactElement) {
  return render(<GluestackUIProvider config={config}>{ui}</GluestackUIProvider>);
}

describe("erro de render nao fecha mais o app", () => {
  let erroSpy: jest.SpyInstance;
  beforeEach(() => {
    // O React loga o erro capturado; silenciar mantem a saida do teste legivel.
    erroSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => erroSpy.mockRestore());

  it("sem erro, mostra o conteudo normalmente", () => {
    renderComTema(
      <ErrorBoundary>
        <Quebra quebrar={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("conteudo")).toBeTruthy();
  });

  it("com erro, mostra a tela em vez de derrubar", () => {
    renderComTema(
      <ErrorBoundary>
        <Quebra quebrar />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Alguma coisa quebrou aqui")).toBeTruthy();
  });

  it("mostra a MENSAGEM do erro — e o unico rastro que o QA tem pra reportar", () => {
    renderComTema(
      <ErrorBoundary>
        <Quebra quebrar />
      </ErrorBoundary>,
    );
    expect(screen.getByText("activeQueue is null")).toBeTruthy();
  });

  it('"Tentar de novo" remonta — o que resolve o erro transitorio', () => {
    function Alternavel() {
      return <Quebra quebrar={false} />;
    }
    const { rerender } = renderComTema(
      <ErrorBoundary>
        <Quebra quebrar />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Alguma coisa quebrou aqui")).toBeTruthy();

    // O filho deixou de quebrar (ex.: ja navegou para fora da tela ruim).
    rerender(
      <GluestackUIProvider config={config}>
        <ErrorBoundary>
          <Alternavel />
        </ErrorBoundary>
      </GluestackUIProvider>,
    );
    fireEvent.press(screen.getByText("Tentar de novo"));
    expect(screen.getByText("conteudo")).toBeTruthy();
  });

  // log-de-falha-na-abertura (DEC-152): a tela de recuperacao oferece o modo seguro.
  it('"Abrir em modo seguro" grava as duas quedas e, sem como recarregar, tenta de novo', async () => {
    let quebrar = true;
    function Q(): React.ReactElement {
      if (quebrar) throw new Error("boom");
      return <Text>conteudo</Text>;
    }
    renderComTema(
      <ErrorBoundary>
        <Q />
      </ErrorBoundary>,
    );
    quebrar = false;
    (Updates.reloadAsync as jest.Mock).mockRejectedValueOnce(new Error("sem como recarregar"));
    fireEvent.press(screen.getByTestId("abrir-em-modo-seguro"));
    await screen.findByText("conteudo");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("vupth_aberturas", '{"pendentes":2}');
  });

  it('"Abrir em modo seguro" recarrega o app quando da', async () => {
    (Updates.reloadAsync as jest.Mock).mockResolvedValueOnce(undefined);
    renderComTema(
      <ErrorBoundary>
        <Quebra quebrar />
      </ErrorBoundary>,
    );
    fireEvent.press(screen.getByTestId("abrir-em-modo-seguro"));
    await waitFor(() => expect(Updates.reloadAsync).toHaveBeenCalled());
  });
});
