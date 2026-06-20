const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const port = 8080;
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};
const sseClients = new Set();

function gzipSize(data) {
  return zlib.gzipSync(data, { level: zlib.constants.Z_BEST_COMPRESSION })
    .length;
}

function fmt(bytes) {
  return bytes < 1024
    ? bytes + " B"
    : bytes < 1048576
      ? (bytes / 1024).toFixed(1) + " KB"
      : (bytes / 1048576).toFixed(1) + " MB";
}

if (process.argv.includes("--size")) {
  const file =
    process.argv[process.argv.indexOf("--size") + 1] || "pixess.html";
  const data = fs.readFileSync(path.join(__dirname, file));
  console.log(`${file}: raw=${fmt(data.length)}  gzip=${fmt(gzipSize(data))}`);
  process.exit(0);
}
let lastMtime = 0;
setInterval(() => {
  try {
    const mtime = Math.round(
      fs.statSync(path.join(__dirname, "pixess.html")).mtimeMs,
    );
    if (lastMtime && mtime > lastMtime) {
      console.log(
        `  hot reload  ${new Date().toLocaleTimeString()}  pixess.html changed  reloading ${sseClients.size} client(s)`,
      );
      for (const res of sseClients) {
        res.write("data: reload\n\n");
      }
    }
    lastMtime = mtime;
  } catch (_) {}
}, 600);
const mainHtml = fs.readFileSync(path.join(__dirname, "pixess.html"), "utf-8");
console.log(`  raw size:  ${fmt(mainHtml.length)}`);
console.log(`  gzip size: ${fmt(gzipSize(mainHtml))}`);

http
  .createServer((req, res) => {
    if (req.url === "/__size") {
      const safe = path
        .normalize(req.url.slice(7))
        .replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(__dirname, safe);
      if (!filePath.startsWith(__dirname) || !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end("404");
        return;
      }
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ raw: data.length, gzip: gzipSize(data) }));
      return;
    }
    if (req.url === "/__reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }
    const safe = path.normalize(req.url).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(__dirname, safe);
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (path.extname(filePath).toLowerCase() === ".html") {
      fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("404");
          return;
        }
        const injected = data.replace(
          "</body>",
          `<script>new EventSource("/__reload").onmessage=e=>e.data=="reload"&&location.reload()</script></body>`,
        );
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(injected);
      });
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("404");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": mime[ext] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(port, () => {
    console.log(`  dev server  http://localhost:${port}/pixess.html`);
  });
