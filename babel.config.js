module.exports = function(api) {
  api.cache(true);
  return {
    // NativeWind (DEC-5, migracao tela por tela como no Partner):
    // jsxImportSource "nativewind" habilita a prop `className` em qualquer
    // componente e o preset processa as classes. NAO afeta as telas que ainda
    // usam o Gluestack v1 (props $token, nao className).
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@assets': './src/assets',
            '@components': './src/components',
            '@routes': './src/routes',
            '@screens': './src/screens',
            '@storage': './src/storage',
            '@theme': './src/theme',
            '@utils': './src/utils',
            '@domain': './src/domain',
            '@services': './src/services',
            '@stores': './src/stores',
            '@hooks': './src/hooks',
          }
        }
      ]
    ]
  };
};