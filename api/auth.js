const https = require("https");

const REDIRECT_URI = "https://paralela-auth-proxy.vercel.app/api/auth";

module.exports = async (req, res) => {
  const { code, state } = req.query || {};

  // 1) Início do fluxo OAuth -> redireciona para GitHub
  if (!code) {
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      scope: "repo,user",
      redirect_uri: REDIRECT_URI,
    });

    // Mantém state se o cliente enviar
    if (state) params.set("state", String(state));

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.writeHead(302, { Location: url });
    return res.end();
  }

  // 2) Callback com code -> troca code por access_token
  try {
    const tokenData = await new Promise((resolve, reject) => {
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
            } catch {
              reject(new Error(`Resposta inválida do GitHub: ${body}`));
            }
          });
        }
      );

      postReq.on("error", reject);
      postReq.write(data);
      postReq.end();
    });

    // Log útil para debugar na Vercel
    console.log("OAuth token response:", tokenData);

    // Se não veio token, mostra erro explícito (não fecha popup)
    if (!tokenData || !tokenData.access_token) {
      const details = JSON.stringify(tokenData || {});
      return res
        .status(400)
        .send(`OAuth sem access_token. Resposta do GitHub: ${details}`);
    }

    // 3) Retorno para popup do Decap
    const safeToken = JSON.stringify(String(tokenData.access_token)); // evita quebrar script
  c<script>
  (function () {
    var token = "__TOKEN__";
    var payload = {
      token: token,
      provider: "github"
    };

    function receiveMessage(e) {
      // envia sucesso para a origem exata que respondeu
      window.opener.postMessage(
        "authorization:github:success:" + JSON.stringify(payload),
        e.origin
      );
      setTimeout(function () { window.close(); }, 300);
    }

    if (window.opener) {
      window.addEventListener("message", receiveMessage, false);
      // inicia handshake com Decap
      window.opener.postMessage("authorizing:github", "*");
    } else {
      document.body.innerHTML =
        "Erro: Janela principal não encontrada. Feche esta aba e tente novamente.";
    }
  })();
</script>

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(content);
  } catch (error) {
    console.error("OAuth proxy error:", error);
    return res.status(500).send("Erro no OAuth proxy: " + error.message);
  }
};
