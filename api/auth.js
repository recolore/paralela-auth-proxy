const https = require("https");

export default function handler(req, res) {
  const { code } = req.query;

  // Se não tem código, redireciona para o GitHub para iniciar o login
  if (!code) {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user`;
    res.writeHead(302, { Location: url });
    return res.end();
  }

  // Se tem código, troca pelo Token de acesso
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
    post_res.on("end", () => {
      const response = JSON.parse(body);
      res.setHeader("Content-Type", "text/html");
      res.end(`
        <script>
          const token = "${response.access_token}";
          const message = "authorizing:github:success:" + JSON.stringify({token: token, provider: 'github'});
          window.opener.postMessage(message, window.location.origin);
        </script>
      `);
    });
  });

  post_req.write(data);
  post_req.end();
}
