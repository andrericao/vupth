// ota-so-compativel (DEC-152): o que NAO conta como mudanca nativa no fingerprint.
// - `extra` do app.json: o app.config.js carimba `extra.commit` a cada commit; sem ignorar, o hash mudaria sempre.
// - `.gitignore`: nao entra no binario.
// Vale para o `eas build`, o `eas fingerprint:compare` e o tools/guarda-ota.js (todos leem este arquivo).
/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  sourceSkips: ['ExpoConfigExtraSection', 'GitIgnore'],
};
