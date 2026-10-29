import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { FUNDO_DO_QR } from "@components/ModalDePagamento";
import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { penaltyService, type PagamentoDaMulta } from "@services/penaltyService";
import { useAuthStore } from "@stores/authStore";
import { useMultaStore } from "@stores/multaStore";
import { fs } from "@stores/fonteStore";
import { useTema } from "@hooks/useTema";
import { copiarTexto } from "@utils/copiar";
import { formatarReais } from "@utils/formatarReais";

const A_CADA_MS = 5000;

/**
 * pagar-multa-avulso (DEC-83, Backend 322c917): "Pagar multa" a qualquer momento. Gera o Pix do app com todas as multas
 * pendentes (QR e copia e cola), acompanha o pagamento até PAID ou EXPIRED. Vem do aviso do limite de duas multas
 * (multa-bloqueia-entrada) e da explicação da multa na escolha de serviços. Um só na árvore (App).
 */
export function ModalDePagarMulta() {
  const aberta = useMultaStore((s) => s.aberta);
  // O conteudo monta a cada abertura: o estado (pagamento, erro, "Copiado") ja comeca limpo.
  return aberta ? <ConteudoDaMulta /> : null;
}

function ConteudoDaMulta() {
  const fechar = useMultaStore((s) => s.fechar);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { cores, veu } = useTema();
  const [pagamento, setPagamento] = useState<PagamentoDaMulta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Ao abrir: gera (ou reabre, se já há um vigente) o Pix das multas.
  useEffect(() => {
    if (!accessToken) return;
    let vivo = true;
    penaltyService
      .pay(accessToken)
      .then((r) => vivo && setPagamento(r.data))
      .catch((e) => vivo && setErro(mensagemDoErro(e, "Não foi possível gerar o Pix da multa agora. Tente de novo.")));
    return () => {
      vivo = false;
    };
  }, [accessToken]);

  // Acompanha o pagamento até acabar.
  const id = pagamento?.id;
  const pendente = pagamento?.status === "PENDING";
  useEffect(() => {
    if (!accessToken || !id || !pendente) return;
    const t = setInterval(() => {
      penaltyService
        .payment(id, accessToken)
        .then((r) => setPagamento(r.data))
        .catch(() => {});
    }, A_CADA_MS);
    return () => clearInterval(t);
  }, [accessToken, id, pendente]);

  const codigo = pagamento?.pix_copy_paste ?? null;
  const pago = pagamento?.status === "PAID";
  const expirou = pagamento?.status === "EXPIRED";

  async function copiar() {
    if (codigo && (await copiarTexto(codigo))) setCopiado(true);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={fechar}>
      <View style={{ flex: 1, backgroundColor: veu, justifyContent: "center", paddingHorizontal: 24 }}>
        <View
          accessibilityViewIsModal
          testID="pagar-multa"
          style={{ backgroundColor: cores.painel, borderRadius: 20, padding: 22, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }}
        >
          <Text style={{ fontFamily: "Archivo_800ExtraBold", fontSize: fs(20), color: cores.textPrimary }}>Pagar multa</Text>
          {erro ? (
            <Text testID="pagar-multa-erro" style={{ color: cores.textSecondary, fontSize: fs(14) }}>{erro}</Text>
          ) : !pagamento ? (
            <Text style={{ color: cores.textSecondary, fontSize: fs(14) }}>Gerando o Pix...</Text>
          ) : pago ? (
            <Text testID="pagar-multa-paga" style={{ color: cores.textPrimary, fontSize: fs(16), fontWeight: "700" }}>
              Multa paga. Pode marcar o seu corte.
            </Text>
          ) : expirou ? (
            <Text testID="pagar-multa-expirou" style={{ color: cores.textSecondary, fontSize: fs(14) }}>
              O Pix venceu. Feche e toque em Pagar multa de novo para gerar outro.
            </Text>
          ) : (
            <>
              <Text testID="pagar-multa-valor" style={{ color: cores.textPrimary, fontSize: fs(28), fontFamily: "Archivo_800ExtraBold" }}>
                {formatarReais(Number(pagamento.amount) || 0)}
              </Text>
              {pagamento.holder_name ? <Text style={{ color: cores.textSecondary, fontSize: fs(13) }}>Para: {pagamento.holder_name}</Text> : null}
              {codigo ? (
                <>
                  {/* tema-fixo: QR escuro sobre branco nos dois temas; o leitor do banco nao le o codigo invertido */}
                  <View style={{ alignSelf: "center", padding: 8, backgroundColor: FUNDO_DO_QR, borderRadius: 12 }}>
                    <QRCode value={codigo} size={180} color={cores.forest} backgroundColor={FUNDO_DO_QR} />
                  </View>
                  <Pressable
                    onPress={copiar}
                    testID="pagar-multa-copiar"
                    accessibilityRole="button"
                    style={{ backgroundColor: cores.green, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
                  >
                    <Text style={{ color: cores.onGreen, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                      {copiado ? "Copiado" : "Copiar o código Pix"}
                    </Text>
                  </Pressable>
                </>
              ) : null}
              <Text style={{ color: cores.textSecondary, fontSize: fs(12) }}>A tela confirma sozinha quando o pagamento cair.</Text>
            </>
          )}
          <Pressable
            onPress={fechar}
            testID="pagar-multa-fechar"
            accessibilityRole="button"
            style={{ backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.textPrimary, borderRadius: 999, paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: cores.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
