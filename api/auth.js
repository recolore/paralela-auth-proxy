const http = require("http");
const https = require("https");
const { parse } = require("url");

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

http.createServer((req, res) => {
  // ADICIONE ESTAS 3 LINHAS ABAIXO PARA LIBERAR O ACESSO
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { pathname, query } = parse(req.url, true);

  if (pathname === "/auth") {
    res.writeHead(302, {
      Location: `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user`
    });
    res.end();
  } else if (pathname === "/callback") {
    const code = query.code;
    const data = JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code
    });

    const post_req = https.request({
      host: "github.com",
      path: "/login/oauth/access_token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    }, (post_res) => {
      let body = "";
      post_res.on("data", (chunk) => body += chunk);
      post_res.on("end", () => {
        const token = JSON.parse(body).access_token;
        res.end(`
          <script>
            window.opener.postMessage("authorizing:github:success:${JSON.stringify({token})}", window.location.origin);
          </script>
        `);
      });
    });

    post_req.write(data);
    post_req.end();
  }
}).listen(3000);
