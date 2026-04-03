const https = require("https");

const REDIRECT_URI = "https://paralela-auth-proxy.vercel.app/api/auth";

function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: String(code),
      redirect_uri: REDIRECT_URI,
    });

    const postReq = https.request(
      {
        host: "github.com",
        path: "/login/oauth/access_token",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "paralela-auth-proxy",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (postRes) => {
        let body = "";
        postRes.on("data", (chunk) => (body += chunk));
        postRes.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`Resposta inválida do GitHub: ${body}`));
          }
        });
      }
    );

    postReq.on("error", reject);
    postReq.write(data);
    postReq.end();
  });
}

module.exports = async (req, res) => {
  const { code, state } = req.query || {};

  // 1) Início do OAuth: redireciona para o GitHub
  if (!code) {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      scope: "repo,user",
      redirect_uri: REDIRECT_URI,
    });

    // repassa state se vier do cliente
    if (state) params.set("state", String(state));

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.writeHead(302, { Location: authUrl });
    return res.end();
  }

  // 2) Callback OAuth: troca code por token
  try {
    const tokenData = await exchangeCodeForToken(code);
    console.log("OAuth token response:", tokenData);

    if (!tokenData || !tokenData.access_token) {
      return res
        .status(400)
        .send(
          "OAuth sem access_token. Resposta do GitHub: " +
            JSON.stringify(tokenData || {})
        );
    }

    const safeToken = JSON.stringify(String(tokenData.access_token));

    // 3) HTML de callback (popup), com handshake compatível com Decap
    const content = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Autenticando...</title>
        </head>
        <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
          <script>
            (function () {
              var token = ${safeToken};
              var payload = { token: token, provider: "github" };

              function receiveMessage(e) {
                window.opener.postMessage(
                  "authorization:github:success:" + JSON.stringify(payload),
                  e.origin
                );
                setTimeout(function () { window.close(); }, 300);
              }

              if (window.opener) {
                window.addEventListener("message", receiveMessage, false);
                window.opener.postMessage("authorizing:github", "*");
              } else {
                document.body.innerHTML =
                  "Erro: Janela principal não encontrada. Feche esta aba e tente novamente.";
              }
            })();
          </script>
          <p>Autenticado com sucesso! Carregando painel...</p>
        </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(content);
  } catch (error) {
    console.error("OAuth proxy error:", error);
    return res.status(500).send("Erro no OAuth proxy: " + error.message);
  }
};
