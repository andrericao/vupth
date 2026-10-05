# shellcheck shell=sh
#
# Garante um Node >= 20.19.4 (o minimo do Expo 54) para o pre-push. Carregado
# com `.` pelo hook — mexe no PATH de quem o carrega.
#
# Andre, 25/09: o expo-doctor parava em "Node v18.19.1". O hook e `sh` e usa o
# node do PATH, que no terminal era o do SISTEMA; o 22 esta no nvm, que o shell
# so carrega sob demanda. Aqui nao se carrega o nvm (ele e bash): so se procura a
# pasta das versoes dele e poe a mais nova na frente do PATH.
#
# Copia do vupth-partner (bateria-alinhada, C28). Travado em src/__tests__/projeto/nodeDoPrePush.test.ts.

_minimo_ok() {
  # $1 = "v20.19.4" -> sim se >= 20.19.4
  _v=${1#v}
  _maj=${_v%%.*}; _rest=${_v#*.}
  _min=${_rest%%.*}; _pat=${_rest#*.}; _pat=${_pat%%[!0-9]*}
  [ -n "$_maj" ] || return 1
  [ "$_maj" -gt 20 ] && return 0
  [ "$_maj" -lt 20 ] && return 1
  [ "$_min" -gt 19 ] && return 0
  [ "$_min" -lt 19 ] && return 1
  [ "${_pat:-0}" -ge 4 ]
}

_node_atual=$(node -v 2>/dev/null || echo "")
if ! _minimo_ok "$_node_atual"; then
  _nvm=${NVM_DIR:-$HOME/.nvm}
  _melhor=""
  if [ -d "$_nvm/versions/node" ]; then
    for _dir in $(ls -1 "$_nvm/versions/node" | sort -V); do
      _minimo_ok "$_dir" && [ -x "$_nvm/versions/node/$_dir/bin/node" ] && _melhor="$_nvm/versions/node/$_dir/bin"
    done
  fi
  if [ -z "$_melhor" ]; then
    echo "[pre-push] Node ${_node_atual:-ausente} e antigo: o Expo 54 pede >= 20.19.4." >&2
    echo "[pre-push] Instale o da .nvmrc (nvm install) e tente de novo." >&2
    return 1 2>/dev/null || exit 1
  fi
  PATH="$_melhor:$PATH"
  export PATH
  echo "[pre-push] Node do sistema ${_node_atual:-ausente} e antigo; usando $(node -v) do nvm."
fi
