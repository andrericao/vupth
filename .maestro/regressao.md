# Teste de regressão (Client)

A bateria completa (`bateria.sh`) é o teste de regressão; a etapa 00b é o teste de fumaça (roda primeiro; se falha, nada mais roda).

**Regra (André, 01/11):** todo bug achado entra aqui. O caminho que quebrou vira um passo no fluxo que o cobre (ou uma etapa nova) **no mesmo commit da correção**, e a linha abaixo diz qual.

| Bug (apelido) | Caminho que quebrou | Etapa/passo que o guarda | Commit |
|---|---|---|---|
| (nenhum registrado ainda) | | | |

**Ajustado (02/11):** a etapa 22 abre o Pix pelo aviso "Pagamento pendente" (Pagar), como a fumaça; o pagar-* de Atendimentos segue só na parte 22.07 (pendência que continua). Falta rodar.
