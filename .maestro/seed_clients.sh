#!/bin/bash
# Seed de clientes via API — cria usuarios sem passar pela UI
# Uso: bash .maestro/seed_clients.sh [local|dev|prod]

ENV=${1:-dev}

case $ENV in
  local) URL="http://localhost:8080" ;;
  dev)   URL="https://vupth-backend-ia.onrender.com" ;;
  prod)  URL="https://vupth-backend-ia-production.up.railway.app" ;;
  *)     echo "Uso: $0 [local|dev|prod]"; exit 1 ;;
esac

SUFFIX=$(date +%s | tail -c 6)
PASSWORD="Teste@123"
ACCOUNTS_FILE=".maestro/TEST_ACCOUNTS_LATEST.md"

echo "Ambiente: $ENV ($URL)"
echo "Sufixo: $SUFFIX"
echo ""

# Wake up Render (cold start)
echo "Acordando backend..."
curl -s --max-time 60 "$URL/establishment" > /dev/null 2>&1
echo "Backend ativo."
echo ""

# Criar clientes
echo "Criando clientes..."
for i in 1 2 3 4 5; do
  EMAIL="cli${i}_${SUFFIX}@teste.com"
  RESPONSE=$(curl -s --max-time 30 -X POST "$URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>&1)

  if echo "$RESPONSE" | grep -q '"id"'; then
    echo "  ✅ Cliente $i: $EMAIL"
  else
    echo "  ❌ Cliente $i: $EMAIL — $RESPONSE"
  fi
done

echo ""

# Buscar establishment para referência
echo "Establishments BARBER abertos:"
curl -s --max-time 30 "$URL/establishment?serviceType=BARBER" 2>&1 | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for e in data:
    if e.get('open_status') == 'OPEN':
        print(f\"  {e['name']} (id: {e['id']})\")" 2>/dev/null

echo ""

# Salvar credenciais no arquivo
cat > "$ACCOUNTS_FILE" << EOF
# Ultima execucao do seed — $ENV
# Data: $(date '+%Y-%m-%d %H:%M')
# Sufixo: $SUFFIX

## Clientes criados

| # | Email | Senha |
|---|-------|-------|
| 1 | cli1_${SUFFIX}@teste.com | $PASSWORD |
| 2 | cli2_${SUFFIX}@teste.com | $PASSWORD |
| 3 | cli3_${SUFFIX}@teste.com | $PASSWORD |
| 4 | cli4_${SUFFIX}@teste.com | $PASSWORD |
| 5 | cli5_${SUFFIX}@teste.com | $PASSWORD |

## Para usar no Maestro

Edite o flow e substitua:
- Email: cli1_${SUFFIX}@teste.com
- Senha: $PASSWORD
EOF

echo "Credenciais salvas em: $ACCOUNTS_FILE"
echo ""
echo "Para rodar o teste Maestro:"
echo "  maestro test .maestro/07_queue_seeded.yaml"
