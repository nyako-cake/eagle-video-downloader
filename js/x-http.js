/**
 * 访问 x.com 内部接口的 HTTP 客户端。
 * 支持直连与 HTTP 代理（CONNECT 隧道）；代理来源：设置 > 环境变量 > Windows 系统代理。
 */

const http = require("http");
const https = require("https");
const tls = require("tls");
const { exec } = require("child_process");

let cachedProxy;

function parseProxy(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const withScheme = /^[a-z]+:\/\//i.test(text) ? text : "http://" + text;
  try {
    const url = new URL(withScheme);
    if (!url.hostname) return null;
    return { host: url.hostname, port: Number(url.port) || 80 };
  } catch (e) {
    return null;
  }
}

function detectProxyFromEnv() {
  return parseProxy(
    process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy ||
      process.env.ALL_PROXY ||
      process.env.all_proxy
  );
}

function detectProxyFromRegistry() {
  return new Promise((resolve) => {
    if (process.platform !== "win32") return resolve(null);
    exec(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { timeout: 5000 },
      (error, stdout) => {
        if (error || !stdout) return resolve(null);
        const matched = stdout.match(/ProxyServer\s+REG_SZ\s+(.+)/i);
        if (!matched) return resolve(null);
        let value = matched[1].trim();
        const httpsPart = value.match(/https=([^;]+)/i);
        if (httpsPart) {
          value = httpsPart[1];
        } else if (value.includes("=")) {
          value = value.split(";")[0].split("=")[1] || value;
        }
        resolve(parseProxy(value));
      }
    );
  });
}

async function resolveProxy(manual) {
  const explicit = parseProxy(manual);
  if (explicit) return explicit;
  if (cachedProxy !== undefined) return cachedProxy;
  cachedProxy = detectProxyFromEnv() || (await detectProxyFromRegistry()) || null;
  return cachedProxy;
}

function collect(res, resolve) {
  let body = "";
  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    body += chunk;
    if (body.length > 8e6) res.destroy();
  });
  res.on("end", () => resolve({ status: res.statusCode, body }));
}

function requestDirect(url, headers) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const req = https.request(
      {
        host: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method: "GET",
        headers: { ...headers, host: target.hostname },
      },
      (res) => collect(res, resolve)
    );
    req.on("error", (error) => resolve({ status: 0, error: error.message }));
    req.setTimeout(20000, () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.end();
  });
}

function requestViaProxy(url, headers, proxy) {
  const target = new URL(url);
  return new Promise((resolve) => {
    const connectReq = http.request({
      host: proxy.host,
      port: proxy.port,
      method: "CONNECT",
      path: target.hostname + ":443",
      headers: { Host: target.hostname + ":443" },
      timeout: 15000,
    });

    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        resolve({ status: 0, error: "proxy CONNECT " + res.statusCode });
        return;
      }
      const tlsSocket = tls.connect({ socket, servername: target.hostname });
      tlsSocket.on("error", (error) => resolve({ status: 0, error: "tls " + error.message }));
      tlsSocket.on("secureConnect", () => {
        const req = https.request(
          {
            host: target.hostname,
            port: 443,
            path: target.pathname + target.search,
            method: "GET",
            createConnection: () => tlsSocket,
            headers: { ...headers, host: target.hostname },
          },
          (response) => collect(response, resolve)
        );
        req.on("error", (error) => resolve({ status: 0, error: error.message }));
        req.setTimeout(20000, () => {
          req.destroy();
          resolve({ status: 0, error: "timeout" });
        });
        req.end();
      });
    });

    connectReq.on("error", (error) => resolve({ status: 0, error: "proxy " + error.message }));
    connectReq.on("timeout", () => {
      connectReq.destroy();
      resolve({ status: 0, error: "proxy timeout" });
    });
    connectReq.end();
  });
}

async function getJson(url, { headers = {}, proxy } = {}) {
  const resolved = await resolveProxy(proxy);
  let result = resolved ? await requestViaProxy(url, headers, resolved) : await requestDirect(url, headers);
  // 代理不可用（例如系统代理设置残留）时退回直连
  if (resolved && !result.status) {
    const direct = await requestDirect(url, headers);
    if (direct.status) result = direct;
  }
  if (result.body) {
    try {
      result.json = JSON.parse(result.body);
    } catch (e) {
      result.json = null;
    }
  }
  return result;
}

/** 下载二进制内容（头像等），返回 Buffer + content-type */
function requestBufferDirect(url, headers) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const req = https.request(
      {
        host: target.hostname,
        port: target.port || 443,
        path: target.pathname + target.search,
        method: "GET",
        headers: { ...headers, host: target.hostname },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => {
          chunks.push(chunk);
          if (chunks.reduce((sum, item) => sum + item.length, 0) > 2e6) res.destroy();
        });
        res.on("end", () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] }));
      }
    );
    req.on("error", (error) => resolve({ status: 0, error: error.message }));
    req.setTimeout(20000, () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
    req.end();
  });
}

function requestBufferViaProxy(url, headers, proxy) {
  const target = new URL(url);
  return new Promise((resolve) => {
    const connectReq = http.request({
      host: proxy.host,
      port: proxy.port,
      method: "CONNECT",
      path: target.hostname + ":443",
      headers: { Host: target.hostname + ":443" },
      timeout: 15000,
    });
    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        resolve({ status: 0, error: "proxy CONNECT " + res.statusCode });
        return;
      }
      const tlsSocket = tls.connect({ socket, servername: target.hostname });
      tlsSocket.on("error", (error) => resolve({ status: 0, error: "tls " + error.message }));
      tlsSocket.on("secureConnect", () => {
        const req = https.request(
          {
            host: target.hostname,
            port: 443,
            path: target.pathname + target.search,
            method: "GET",
            createConnection: () => tlsSocket,
            headers: { ...headers, host: target.hostname },
          },
          (response) => {
            const chunks = [];
            response.on("data", (chunk) => {
              chunks.push(chunk);
              if (chunks.reduce((sum, item) => sum + item.length, 0) > 2e6) response.destroy();
            });
            response.on("end", () =>
              resolve({ status: response.statusCode, buffer: Buffer.concat(chunks), contentType: response.headers["content-type"] })
            );
          }
        );
        req.on("error", (error) => resolve({ status: 0, error: error.message }));
        req.setTimeout(20000, () => {
          req.destroy();
          resolve({ status: 0, error: "timeout" });
        });
        req.end();
      });
    });
    connectReq.on("error", (error) => resolve({ status: 0, error: "proxy " + error.message }));
    connectReq.on("timeout", () => {
      connectReq.destroy();
      resolve({ status: 0, error: "proxy timeout" });
    });
    connectReq.end();
  });
}

async function getRaw(url, { headers = {}, proxy } = {}) {
  const resolved = await resolveProxy(proxy);
  let result = resolved ? await requestBufferViaProxy(url, headers, resolved) : await requestBufferDirect(url, headers);
  if (resolved && !result.status) {
    const direct = await requestBufferDirect(url, headers);
    if (direct.status) result = direct;
  }
  return result;
}

module.exports = {
  getJson,
  getRaw,
  parseProxy,
  resolveProxy,
  detectProxyFromEnv,
  detectProxyFromRegistry,
};
