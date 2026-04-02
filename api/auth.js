const https = require("https");

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user`;
    res.writeHead(302, { Location: url });
    return res.end();
  }

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

    const content = `
      <html>
      <body>
        <script>
          (function() {
            const token = "${tokenData.access_token}";
            const message = "authorizing:github:success:" + JSON.stringify({
              token: token,
              provider: "github"
            });
            
            // Tentativa de envio para a janela que abriu o pop-up
            if (window.opener) {
              window.opener.postMessage(message, "*");
              console.log("Mensagem enviada. Fechando janela...");
              setTimeout(() => { window.close(); }, 200);
            } else {
              document.body.innerHTML = "Erro: Janela principal não encontrada. Feche esta aba e tente novamente.";
            }
          })();
        </script>
        <p style="font-family:sans-serif; text-align:center; margin-top:50px;">
          Autenticado com sucesso! Carregando painel da Paralela Digital...
        </p>
      </body>
      </html>
    `;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(content);
  } catch (error) {
    res.status(500).send("Erro: " + error.message);
  }
};
