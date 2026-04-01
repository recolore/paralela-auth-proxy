const https = require("https");

export default function handler(req, res) {
  // A Vercel agora vai usar essa mesma função para /api/auth e para o callback
  const { code } = req.query;

  // 1. Se não tem código, redireciona para o GitHub (Início do login)
  if (!code) {
    const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user`;
    res.writeHead(302, { Location: url });
    return res.end();
  }

  // 2. Se tem código, o GitHub nos enviou de volta (Callback)
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
      
      // Enviamos o token de volta para o seu site da Paralela Digital
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
