import { useEffect, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";

import {
  Pagamento,
  avisoDaPendencia,
  pixDoPagamento,
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
import { SaibaMaisDoPreco } from "@components/SaibaMaisDoPreco";
import { useTema } from "@hooks/useTema";

// tema-fixo: o leitor do banco nao le o codigo invertido; o QR e branco nos dois temas.
const FUNDO_DO_QR = "#FFFFFF";

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
  const recusadoPeloPush = usePendenciaStore((s) => s.recusado);
  const fechar = usePendenciaStore((s) => s.fechar);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { cores, veu } = useTema();
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [chaveCopiada, setChaveCopiada] = useState(false);
  // pagar-ao-finalizar-corte (André, 24/10): o Pix e o QR Code ficam recolhidos num drop down; "Já paguei" e "Fechar" ficam a vista.
  const [pixAberto, setPixAberto] = useState(false);
  // pagamento-ja-paguei: o profissional recusou (AWAITING_CONFIRMATION voltou a PENDING).
  const [recusadoAoVivo, setRecusadoAoVivo] = useState(false);
  const statusAnterior = useRef<string | null>(null);
  const recusado = recusadoPeloPush || recusadoAoVivo;

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
      setChaveCopiada(false);
      setPixAberto(false);
      setRecusadoAoVivo(false);
      statusAnterior.current = null;
    };
  }, [pagando, accessToken]);

  // pagar-sempre-disponivel (André, 25/10): a opcao de pagar NUNCA some. O gateway pode cair e o profissional
  // pode receber em dinheiro ou no Pix pessoal. E pagar-pix-do-profissional-e-do-gateway (André, 25/10): os DOIS
  // Pix, quando existirem: o do profissional (a chave, com "Copiar chave", nunca a do dono) em DESTAQUE; o do
  // gateway (QR e copia e cola) com menos destaque, num drop down recolhido. "Já paguei" e "Fechar" sempre a
  // vista. Sem nenhum Pix, o texto diz que o pagamento e combinado com o profissional.
  // pagamento-pelo-asaas (DEC-119): com `gateway`, o QR e o copia e cola sao os do Asaas.
  const pix = pixDoPagamento(pagamento);
  const chave = pagamento?.pix_key || null;
  const temPix = !!(pix.codigo || pix.qrImagem || chave);

  // pagamento-ja-paguei: o Asaas (webhook) e o profissional ("recebi" ou recusa) mudam o status por
  // fora; o modal confere de tempos em tempos ate o "Pago". Sem Asaas, so enquanto espera o profissional.
  const aguardandoWebhook = pagamento != null && pagamento.status !== "PAID" && (pix.viaAsaas || pagamento.status === "AWAITING_CONFIRMATION");
  useEffect(() => {
    if (!pagando || !accessToken || !aguardandoWebhook) return;
    const id = setInterval(() => {
      paymentService
        .get(pagando, accessToken)
        .then((r) => {
          if (statusAnterior.current === "AWAITING_CONFIRMATION" && r.data?.status === "PENDING") setRecusadoAoVivo(true);
          statusAnterior.current = r.data?.status ?? null;
          setPagamento(r.data);
          if (r.data?.status === "PAID") queryClient.invalidateQueries({ queryKey: CHAVE_PENDENTES });
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [pagando, accessToken, aguardandoWebhook, queryClient]);

  if (!aviso && !pagando) return null;

  async function jaPaguei() {
    if (!pagando || !accessToken || enviando) return;
    setEnviando(true);
    try {
      const { data } = await paymentService.claim(pagando, accessToken);
      setRecusadoAoVivo(false);
      statusAnterior.current = data?.status ?? "AWAITING_CONFIRMATION";
      setPagamento((p) => ({ ...(p ?? data), ...data, status: data?.status ?? "AWAITING_CONFIRMATION" }));
      queryClient.invalidateQueries({ queryKey: CHAVE_PENDENTES });
    } catch {
      setErro(true);
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    if (pix.codigo && (await copiarTexto(pix.codigo))) setCopiado(true);
  }

  async function copiarChave() {
    if (chave && (await copiarTexto(chave))) setChaveCopiada(true);
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
              {/* pagamento-pelo-asaas: no sandbox nao ha dinheiro real, e a faixa diz isso antes do resto. */}
              {pix.teste ? (
                <View testID="pagamento-de-teste" style={{ gap: 6 }}>
                  <FaixaESelo tipo="atencao" selo="Pagamento de teste" />
                  <Text style={{ color: cores.textSecondary, fontSize: fs(13) }}>Sem dinheiro real.</Text>
                </View>
              ) : null}
              <Text testID="pix-status" style={{ color: cores.textPrimary, fontSize: fs(14), fontWeight: "600" }}>
                {textoDoStatus(pagamento.status)}
              </Text>
              {servicos > 0 ? <Linha rotulo="Serviço" valor={reais(servicos)} /> : null}
              {multas > 0 ? <Linha rotulo="Multa" valor={reais(multas)} /> : null}
              <Linha rotulo="Total" valor={reais(pagamento.amount)} forte />
              {/* politica-de-preco-saiba-mais (DEC-91): o total inclui a taxa de pagamento. */}
              <View style={{ alignItems: "flex-start" }} testID="pix-preco-saiba-mais">
                <SaibaMaisDoPreco />
              </View>
              {pagamento.holder_name ? (
                <Text style={{ color: cores.textSecondary, fontSize: fs(13) }}>Para: {pagamento.holder_name}</Text>
              ) : null}
              {/* O Pix do profissional, em destaque: a chave em texto e o Copiar chave. */}
              {chave && podeAvisarQuePagou(pagamento.status) ? (
                <View
                  testID="pix-profissional"
                  style={{ gap: 8, backgroundColor: cores.sobrePainel, borderRadius: 14, padding: 14 }}
                >
                  <Text style={{ color: cores.textSecondary, fontSize: fs(12) }}>Pix do profissional</Text>
                  <Text selectable testID="pix-chave" style={{ color: cores.textPrimary, fontSize: fs(16), fontWeight: "700" }}>
                    {chave}
                  </Text>
                  <Botao titulo={chaveCopiada ? "Copiada" : "Copiar chave"} feito={chaveCopiada} testID="pix-copiar-chave" onPress={copiarChave} />
                </View>
              ) : null}
              {/* O Pix do gateway (ou o copia e cola), com menos destaque: recolhido num drop down. */}
              {(pix.codigo || pix.qrImagem) && podeAvisarQuePagou(pagamento.status) ? (
                <>
                  <Pressable
                    onPress={() => setPixAberto((v) => !v)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: pixAberto }}
                    testID="pix-dropdown"
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}
                  >
                    <Text style={{ color: cores.textPrimary, fontFamily: "Inter_600SemiBold", fontSize: fs(14) }}>
                      {pix.viaAsaas ? "Pix do app (QR e copia e cola)" : "Pix e QR Code"}
                    </Text>
                    {pixAberto ? <ChevronUp size={18} color={cores.textPrimary} /> : <ChevronDown size={18} color={cores.textPrimary} />}
                  </Pressable>
                  {pixAberto ? (
                    <>
                      {/* pagamento-no-concluido (DEC-78): o QR em cima do copiar. */}
                      <View style={{ alignItems: "center" }} testID="pix-qr">
                        {/* tema-fixo: QR escuro sobre branco nos dois temas; o leitor do banco nao le o codigo invertido */}
                        {pix.codigo ? (
                          <QRCode value={pix.codigo} size={180} color={cores.forest} backgroundColor={FUNDO_DO_QR} />
                        ) : (
                          <Image
                            testID="pix-qr-imagem"
                            source={{ uri: pix.qrImagem!.startsWith("data:") || pix.qrImagem!.startsWith("http") ? pix.qrImagem! : `data:image/png;base64,${pix.qrImagem}` }}
                            style={{ width: 180, height: 180, backgroundColor: FUNDO_DO_QR }}
                          />
                        )}
                      </View>
                      {pix.codigo ? (
                        <>
                          <Text selectable numberOfLines={3} testID="pix-codigo" style={{ color: cores.textPrimary, fontSize: fs(12), backgroundColor: cores.sobrePainel, borderRadius: 10, padding: 10 }}>
                            {pix.codigo}
                          </Text>
                          <Botao titulo={copiado ? "Copiado" : "Copiar"} claro feito={copiado} testID="pix-copiar" onPress={copiar} />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}
              {/* pagar-sempre-disponivel: sem nenhum Pix (gateway fora e profissional sem chave), o pagamento e combinado. */}
              {!temPix && podeAvisarQuePagou(pagamento.status) ? (
                <Text testID="pix-combinado" style={{ color: cores.textSecondary, fontSize: fs(13), lineHeight: fs(18) }}>
                  Sem Pix cadastrado. O pagamento é combinado com o profissional (dinheiro).
                </Text>
              ) : null}
              {/* o profissional nao confirmou: o atendimento segue pendente e o cliente pode tocar de novo */}
              {recusado && podeAvisarQuePagou(pagamento.status) ? (
                <Text testID="pix-recusado" style={{ color: cores.danger, fontSize: fs(13), lineHeight: fs(18) }}>
                  O profissional não confirmou o pagamento. Confira se ele saiu da sua conta.
                </Text>
              ) : null}
              {pix.viaAsaas && pagamento.status !== "PAID" ? (
                <Text testID="pix-automatico" style={{ color: cores.textSecondary, fontSize: fs(13) }}>
                  A confirmação é automática.
                </Text>
              ) : null}
              {/* as duas vias quitam o mesmo atendimento: com o Asaas, o "Já paguei" segue valendo e some no PAID */}
              {podeAvisarQuePagou(pagamento.status) ? (
                <Botao titulo="Já paguei" testID="pix-ja-paguei" desligado={enviando} onPress={jaPaguei} />
              ) : null}
              {/* "Fechar" sempre a vista (antes so sem "Já paguei" ou com o Asaas) */}
              <Botao titulo="Fechar" claro testID="pix-ok" onPress={fechar} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
