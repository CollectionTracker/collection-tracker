// Serves the production build to other computers on the network over HTTPS. Browsers only allow the APIs the in-browser
// database needs (navigator.locks) on HTTPS or localhost, so plain http://<lan-ip>:3000 fails to load. This runs
// `next start` on 127.0.0.1 and puts an HTTPS proxy with a self-signed certificate in front of it on every interface.
// Run `npm run build` first. PORT (default 3000) is Next's local port, HTTPS_PORT (default 3443) the LAN one.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { hostname, networkInterfaces } from "node:os";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const port = Number(process.env.PORT ?? 3000);
const httpsPort = Number(process.env.HTTPS_PORT ?? 3443);

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

// The certificate names this machine's current addresses; it is made again when they change (e.g. a new DHCP lease).
const certDir = path.join(root, ".certs");
const keyFile = path.join(certDir, "lan-key.pem");
const certFile = path.join(certDir, "lan-cert.pem");
const namesFile = path.join(certDir, "lan-names.txt");
const names = ["DNS:localhost", `DNS:${hostname()}`, "IP:127.0.0.1", ...addresses.map((a) => `IP:${a}`)].join(",");
if (!existsSync(certFile) || !existsSync(keyFile) || !existsSync(namesFile) || readFileSync(namesFile, "utf8") !== names) {
  mkdirSync(certDir, { recursive: true });
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "825",
    "-keyout", keyFile, "-out", certFile,
    "-subj", "/CN=Collection Tracker (LAN)",
    "-addext", `subjectAltName=${names}`,
  ], { stdio: "ignore" });
  writeFileSync(namesFile, names);
  console.log(`Created a self-signed certificate in ${path.relative(root, certDir)}/ for ${names}`);
}

const next = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(port)], { cwd: root, stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => next.kill(signal));

https
  .createServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, (req, res) => {
    // Host is kept so Next's server action origin check sees the address the browser used.
    const upstream = http.request(
      {
        host: "127.0.0.1",
        port,
        method: req.method,
        path: req.url,
        headers: {
          ...req.headers,
          "x-forwarded-proto": "https",
          "x-forwarded-host": req.headers.host,
          "x-forwarded-for": req.socket.remoteAddress,
        },
      },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
      res.end("The app is still starting or has stopped. Try again in a moment.");
    });
    req.pipe(upstream);
  })
  .listen(httpsPort, "0.0.0.0", () => {
    console.log("Open from another computer on the network:");
    for (const a of addresses) console.log(`  https://${a}:${httpsPort}`);
  });
