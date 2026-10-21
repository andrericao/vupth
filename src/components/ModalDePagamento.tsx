import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";

import {
  Pagamento,
  avisoDaPendencia,
  podeAvisarQuePagou,
  reais,
  textoDoStatus,
} from "@domain/pagamento/pendencia";
import { CHAVE_PENDENTES } from "@hooks/usePagamentosPendentes";
import { paymentService } from "@services/paymentService";
import { useAuthStore } from "@stores/authStore";
import { usePendenciaStore } from "@stores/pendenciaStore";
import { fs } from "@stores/fonteStore";
import { copiarTexto } from "@utils/copiar";
import { movimentoReduzido } from "@utils/motion";
import { FaixaESelo } from "@components/FaixaESelo";
import { useTema } from "@hooks/useTema";

function Botao({ titulo, onPress, claro, testID, desligado, feito }: {
  titulo: string; onPress: () => void; claro?: boolean; testID: string; desligado?: boolean; feito?: boolean;
}) {
  const { cores } = useTema();
  // O primario e green + onGreen nos dois temas; o "claro" (vazado) e painel + o texto do tema.
  const rotulo = claro ? cores.textPrimary : cores.onGreen;
  return (
    <Pressable
      onPress={onPress}
      disabled={desligado}
      testID={testID}
      accessibilityRole="button"
      // Escala estatica no pressionado (sem Reanimated no app): o toque encolhe o botao.
      style={({ pressed }) => ({
        backgroundColor: claro ? cores.painel : cores.green,
        borderWidth: claro ? 1 : 0,
        borderColor: cores.textPrimary,
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
        opacity: desligado ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {feito ? <ChecagemQueSurge cor={rotulo} /> : null}
        <Text style={{ color: rotulo, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>{titulo}</Text>
      </View>
    </Pressable>
  );
}

// "Copiado" so trocava o texto, e quem copia um codigo Pix precisa ter certeza de que
// copiou. O check surge com um salto (0 a 1, passando de 1 por um instante).
function ChecagemQueSurge({ cor }: { cor: string }) {
  const [escala] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let vivo = true;
    let anim: Animated.CompositeAnimation | null = null;
    movimentoReduzido().then((reduzido) => {
      if (!vivo) return;
      if (reduzido) {
        escala.setValue(1);
        return;
      }
      anim = Animated.spring(escala, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true });
      anim.start();
    });
    return () => {
      vivo = false;
      anim?.stop();
    };
  }, [escala]);
  return (
    <Animated.View testID="pix-copiado-check" style={{ transform: [{ scale: escala }] }}>
      <Check size={16} color={cor} />
    </Animated.View>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  const { cores } = useTema();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: cores.textSecondary, fontSize: fs(14) }}>{rotulo}</Text>
      <Text style={{ color: cores.textPrimary, fontSize: fs(14), fontWeight: forte ? "700" : "500" }}>{valor}</Text>
    </View>
  );
}

/**
 * pendencia-de-pagamento (CLI-30): o aviso do 409 PAYMENT_PENDING (um MODAL,
 * nao uma tela, com o "Pagar") e o Pix do atendimento — valor, copia-e-cola e
 * "Já paguei". Um so na arvore (App), como o ConviteDeTroca.
 */
export function ModalDePagamento() {
  const aviso = usePendenciaStore((s) => s.aviso);
  const pagando = usePendenciaStore((s) => s.pagando);
  const pagar = usePendenciaStore((s) => s.pagar);
  const fechar = usePendenciaStore((s) => s.fechar);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { cores, veu } = useTema();
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!pagando || !accessToken) return;
    let vivo = true;
    paymentService
      .get(pagando, accessToken)
      .then((r) => vivo && setPagamento(r.data))
      .catch(() => vivo && setErro(true));
    return () => {
      vivo = false;
      setPagamento(null);
      setErro(false);
      setCopiado(false);
    };
  }, [pagando, accessToken]);

  if (!aviso && !pagando) return null;

  async function jaPaguei() {
    if (!pagando || !accessToken || enviando) return;
    setEnviando(true);
    try {
      const { data } = await paymentService.claim(pagando, accessToken);
      setPagamento((p) => ({ ...(p ?? data), ...data, status: data?.status ?? "AWAITING_CONFIRMATION" }));
      queryClient.invalidateQueries({ queryKey: CHAVE_PENDENTES });
    } catch {
      setErro(true);
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    if (pagamento?.pix_copy_paste && (await copiarTexto(pagamento.pix_copy_paste))) setCopiado(true);
  }

  const texto = aviso ? avisoDaPendencia(aviso) : null;
  const servicos = Number(pagamento?.services_value) || 0;
  const multas = Number(pagamento?.penalties_value) || 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={fechar}>
      <View style={{ flex: 1, backgroundColor: veu, justifyContent: "center", paddingHorizontal: 24 }}>
        <View
          accessibilityViewIsModal
          testID={aviso ? "aviso-de-pendencia" : "pix-do-atendimento"}
          style={{ backgroundColor: cores.painel, borderRadius: 20, padding: 22, gap: 14, width: "100%", maxWidth: 420, alignSelf: "center" }}
        >
          {/* O aviso de pendencia e dinheiro: faixa e selo dizem isso antes do texto.
              O Pix em si nao ganha selo (e a tela de pagar, nao um aviso). */}
          {texto ? <FaixaESelo tipo="dinheiro" selo="Pagamento" /> : null}
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <Text style={{ flex: 1, fontFamily: "Archivo_800ExtraBold", fontSize: fs(18), color: cores.textPrimary }}>
              {texto ? texto.titulo : "Pagar por Pix"}
            </Text>
            <Pressable onPress={fechar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar" testID="pagamento-fechar">
              <X size={20} color={cores.textPrimary} />
            </Pressable>
          </View>

          {texto ? (
            <>
              <Text style={{ color: cores.textSecondary, fontSize: fs(14), lineHeight: fs(20) }}>{texto.mensagem}</Text>
              {aviso && aviso.length > 0 ? (
                <Botao titulo="Pagar" testID="pendencia-pagar" onPress={() => pagar(aviso[0].attendance_id)} />
              ) : null}
              <Botao titulo="Agora não" claro testID="pendencia-agora-nao" onPress={fechar} />
            </>
          ) : erro ? (
            <Text style={{ color: cores.textSecondary, fontSize: fs(14) }}>Não foi possível carregar o pagamento. Tente de novo.</Text>
          ) : !pagamento ? (
            <Text style={{ color: cores.textSecondary, fontSize: fs(14) }}>Carregando...</Text>
          ) : (
            <>
              <Text testID="pix-status" style={{ color: cores.textPrimary, fontSize: fs(14), fontWeight: "600" }}>
                {textoDoStatus(pagamento.status)}
              </Text>
              {servicos > 0 ? <Linha rotulo="Serviço" valor={reais(servicos)} /> : null}
              {multas > 0 ? <Linha rotulo="Multa" valor={reais(multas)} /> : null}
              <Linha rotulo="Total" valor={reais(pagamento.amount)} forte />
              {pagamento.holder_name ? (
                <Text style={{ color: cores.textSecondary, fontSize: fs(13) }}>Para: {pagamento.holder_name}</Text>
              ) : null}
              {pagamento.pix_copy_paste && podeAvisarQuePagou(pagamento.status) ? (
                <>
                  {/* pagamento-no-concluido (DEC-78): o QR em cima do copiar. */}
                  <View style={{ alignItems: "center" }} testID="pix-qr">
                    {/* tema-fixo: QR escuro sobre branco nos dois temas; o leitor do banco nao le o codigo invertido */}
                    <QRCode value={pagamento.pix_copy_paste} size={180} color={cores.forest} backgroundColor="#FFFFFF" />
                  </View>
                  <Text selectable numberOfLines={3} testID="pix-codigo" style={{ color: cores.textPrimary, fontSize: fs(12), backgroundColor: cores.sobrePainel, borderRadius: 10, padding: 10 }}>
                    {pagamento.pix_copy_paste}
                  </Text>
                  <Botao titulo={copiado ? "Copiado" : "Copiar código Pix"} claro feito={copiado} testID="pix-copiar" onPress={copiar} />
                </>
              ) : null}
              {podeAvisarQuePagou(pagamento.status) ? (
                <Botao titulo={enviando ? "Enviando..." : "Já paguei"} testID="pix-ja-paguei" desligado={enviando} onPress={jaPaguei} />
              ) : (
                <Botao titulo="Fechar" claro testID="pix-ok" onPress={fechar} />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
