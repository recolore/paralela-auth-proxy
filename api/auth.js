const https = require("https");

module.exports = async (req, res) => {
  const { code } = req.query;

  // 1. Início do Login: Se não tem código, vai para o GitHub
  if (!code) {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user`;
    res.writeHead(302, { Location: url });
    return res.end();
  }

  // 2. Callback: Troca o código pelo Token (Usando Promise para a Vercel esperar)
  try {
    const tokenData = await new Promise((resolve, reject) => {
      const data = JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      });

      const post_req = https.request({
        host: "github.com",
        path: "/login/oauth/access_token",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }, (post_res) => {
        let body = "";
        post_res.on("data", (chunk) => (body += chunk));
        post_res.on("end", () => resolve(JSON.parse(body)));
      });

      post_req.on("error", reject);
      post_req.write(data);
      post_req.end();
    });

    // 3. Resposta Final: Manda o token para o seu blog na Paralela Digital
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
      <html>
      <body>
        <script>
          (function() {
            const token = "${tokenData.access_token}";
            const provider = "github";
            const message = "authorizing:" + provider + ":success:" + JSON.stringify({
              token: token,
              provider: provider
            });
            // Envia a mensagem para a janela principal e fecha o pop-up
            window.opener.postMessage(message, window.opener.location.origin);
          })();
        </script>
        <p>Autenticado com sucesso! Esta janela fechará em breve...</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro na autenticação: " + error.message);
  }
};
