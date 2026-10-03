import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { RefreshCw } from "lucide-react-native";

import { ehNavegador } from "@utils/ehNavegador";
import { ScreenHeader } from "@components/ScreenHeader";
import { WsDiagnostics } from "@components/WsDiagnostics";
import { PushDiagnostics } from "@components/PushDiagnostics";
import { useComingSoonStore } from "@stores/comingSoonStore";
import { COMING_SOON_LABELS, ComingSoonFeature } from "@domain/comingSoon";
import { commitDoApp } from "@domain/versao";

// A versao e o que a cerca (atualizar, diagnosticos) saiu da tela de Perfil
// para esta, atras do item "Versão do app" — o mesmo desenho do partner
// (Andre 2026-09-16: "o menu igual o do partner, a versao deve ser escondida").
// Quem so quer mexer na conta nao ve numero de build nem painel tecnico.
export function Sistema() {
  const [toquesNaVersao, setToquesNaVersao] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Funcionalidades "em breve" mais tocadas primeiro = as que fizeram mais falta.
  const comingSoonCounts = useComingSoonStore((s) => s.counts);
  const awaited = (Object.entries(comingSoonCounts) as [string, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  async function handleCheckUpdate() {
    setIsChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          "Atualização baixada",
          "O app vai reiniciar para aplicar a nova versão.",
          [{ text: "OK", onPress: () => Updates.reloadAsync() }],
        );
      } else {
        Alert.alert("Tudo certo", "Você já está na versão mais recente.");
      }
    } catch {
      Alert.alert(
        "Não foi possível verificar",
        "Atualizações OTA só funcionam no APK de build (não no Expo Go/modo dev).",
      );
    } finally {
      setIsChecking(false);
    }
  }

  const otaInfo = Updates.updateId
    ? `OTA ${Updates.updateId.slice(0, 8)}${Updates.createdAt ? ` · ${Updates.createdAt.toLocaleDateString()} ${Updates.createdAt.toLocaleTimeString()}` : ""}`
    : "bundle embutido (nenhum OTA aplicado)";

  return (
    // NativeWind (DEC-5): mesmas medidas do v1; o fs(13)/fs(10) virou
    // text-f13/text-f10, que seguem o tamanho da letra pelas variaveis CSS.
    <ScrollView
      className="flex-1 bg-vupth-background"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 pb-[30px] px-4">
        <ScreenHeader title="Sistema" subtitle="Versão do app e atualizações." />

        <View className="pt-6 gap-3 items-center">
          {/* NO NAVEGADOR a tela mostra so a identificacao da versao — sem o
              botao e sem texto explicando como atualizar (Andre, 18/09; o
              partner fez igual). O caminho foi este: primeiro o aviso do
              Ctrl+Shift+R SUBSTITUIA o botao, e a tela ficava com uma frase e
              mais nada; depois ele virou um bloco a mais; e a decisao final
              tirou os dois. Ali nao existe OTA: o botao nao teria o que fazer,
              e a instrucao de recarregar e do navegador, nao do app. */}
          {!ehNavegador() && (
            <TouchableOpacity onPress={handleCheckUpdate} testID="check-update">
              <View className="flex-row bg-vupth-surface rounded-full px-4 py-3 gap-2 items-center">
                <RefreshCw size={15} color="#163300" />
                <Text className="font-heading text-f13 text-vupth-forest">
                  {isChecking ? "Verificando..." : "Verificar atualização"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Versao em DM Mono: e numero de build, nao prosa. */}
          {/* [QA] 7 toques aqui abrem o diagnostico de WebSocket e de push, e a
              contagem do "em breve". Gesto de "modo desenvolvedor": segue
              acessivel em producao, some da vista de quem nao procura
              (Alexia 2026-08-21). */}
          <TouchableOpacity
            onPress={() => setToquesNaVersao((n) => n + 1)}
            accessibilityRole="button"
            accessibilityLabel="Informações da versão"
            testID="version-line"
          >
            {/* Junta so o que EXISTE: em dev o runtime e o canal vem vazios. */}
            <Text className="font-mono text-f10 text-vupth-textSecondary text-center">
              {[Updates.runtimeVersion, Updates.channel, otaInfo, commitDoApp(Constants.expoConfig?.extra)].filter(Boolean).join(" · ")}
            </Text>
          </TouchableOpacity>

          {toquesNaVersao >= 7 && (
            <>
              <WsDiagnostics />
              <PushDiagnostics />
            </>
          )}
        </View>

        {/* [QA] Contador de toques em "em breve" — instrumentacao do TIME, nao
            do usuario. */}
        {toquesNaVersao >= 7 && awaited.length > 0 && (
          <View className="mt-8">
            <Text className="font-heading text-md text-vupth-textPrimary mb-1">
              Funcionalidades aguardadas
            </Text>
            <Text className="font-body text-xs text-vupth-textSecondary mb-3">
              As mais tocadas fizeram mais falta — priorizar quando o backend liberar.
            </Text>
            <View className="rounded-card overflow-hidden">
              {awaited.map(([feature, count]) => (
                <View
                  key={feature}
                  className="flex-row bg-vupth-surface px-4 py-3 border-b border-vupth-border items-center"
                >
                  <Text className="font-body text-sm text-vupth-textPrimary flex-1">
                    {COMING_SOON_LABELS[feature as ComingSoonFeature] ?? feature}
                  </Text>
                  <View className="bg-vupth-greenTint rounded-full px-3 py-1">
                    <Text className="font-heading text-xs text-vupth-forest">
                      {count}×
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
