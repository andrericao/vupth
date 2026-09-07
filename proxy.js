const http = require('http');
const https = require('https');
const url = require('url');

// Destino do proxy. No navegador e ele quem decide com qual backend o app
// fala, porque o backend nao publica CORS e a chamada direta seria bloqueada.
// Porta 8080 pra casar com EXPO_PUBLIC_API_ENV=local (ver src/services/api.ts).
//   API_TARGET=https://vupth-backend-ia.onrender.com node proxy.js
const TARGET = process.env.API_TARGET || 'https://vupth-backend-ia-production.up.railway.app';
const PORT = 8080;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const targetUrl = TARGET + req.url;
  const parsed = url.parse(targetUrl);

  const options = {
    hostname: parsed.hostname,
    port: 443,
    path: parsed.path,
    method: req.method,
    headers: { ...req.headers, host: parsed.hostname },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Proxy error');
  });

  req.pipe(proxyReq);
});

// So a loopback: sem isso o proxy escutava em todas as interfaces, e qualquer
// aparelho na mesma rede virava cliente do backend (por padrao, o de PRODUCAO)
// com CORS liberado. Ferramenta pessoal de dev escuta so na propria maquina.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Proxy rodando em http://localhost:${PORT} -> ${TARGET}`);
});
