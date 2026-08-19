import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv();
const siteRoot = path.resolve(process.env.PUBLIC_DIR || here);
const dataRoot = path.resolve(process.env.DATA_DIR || path.join(here, "private-data"));
const port = Number(process.env.PORT || 8080);
const publicOrigin = process.env.PUBLIC_ORIGIN || `http://localhost:${port}`;
const adminToken = process.env.ADMIN_TOKEN;
const encryptionKeyHex = process.env.REGISTRATION_ENCRYPTION_KEY;

if (!adminToken || !/^[0-9a-f]{64}$/i.test(encryptionKeyHex || "")) {
  throw new Error("Set ADMIN_TOKEN and REGISTRATION_ENCRYPTION_KEY (64 hex characters) before starting.");
}

const encryptionKey = Buffer.from(encryptionKeyHex, "hex");
const privateFile = path.join(dataRoot, "registrations.enc.json");
const exportFile = path.join(dataRoot, "registrations.xlsx");
const allowedMethods = new Set(["GET", "HEAD", "POST"]);
const rateMap = new Map();
let writeQueue = Promise.resolve();

function loadDotEnv() {
  const envFile = path.join(here, ".env");
  if (!fsSync.existsSync(envFile)) return;
  const lines = fsSync.readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

function cleanText(value, max = 200) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function clientIp(req) {
  return (req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "");
}

function allowRate(ip) {
  const now = Date.now();
  const current = (rateMap.get(ip) || []).filter(time => now - time < 60 * 60 * 1000);
  if (current.length >= 20) return false;
  current.push(now);
  rateMap.set(ip, current);
  return true;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'"
  });
  res.end(payload);
}

function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || origin === publicOrigin;
}

function setCors(res, req) {
  if (req.headers.origin === publicOrigin) {
    res.setHeader("Access-Control-Allow-Origin", publicOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    res.setHeader("Vary", "Origin");
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32 * 1024) throw new Error("payload-too-large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readEncryptedRows() {
  try {
    const envelope = JSON.parse(await fs.readFile(privateFile, "utf8"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(envelope.iv, "base64"));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plain = Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]);
    return JSON.parse(plain.toString("utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeEncryptedRows(rows) {
  await fs.mkdir(dataRoot, { recursive: true });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(rows), "utf8"), cipher.final()]);
  const envelope = {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64")
  };
  const tempFile = privateFile + ".tmp";
  await fs.writeFile(tempFile, JSON.stringify(envelope), { mode: 0o600 });
  await fs.rename(tempFile, privateFile);
}

function withWriteLock(task) {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

async function exportWorkbook(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("報名資料");
  sheet.columns = [
    { header: "報名時間", key: "createdAt", width: 22 },
    { header: "報名身分", key: "ticket", width: 18 },
    { header: "姓名", key: "name", width: 14 },
    { header: "職稱", key: "title", width: 18 },
    { header: "所屬單位", key: "organization", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "聯絡電話", key: "phone", width: 18 },
    { header: "感興趣議題", key: "interests", width: 32 },
    { header: "午餐需求", key: "dietary", width: 14 }
  ];
  rows.forEach(row => sheet.addRow({ ...row, interests: row.interests.join("、") }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0A2540" } };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  sheet.eachRow(row => { row.alignment = { vertical: "top", wrapText: true }; });
  sheet.getColumn("createdAt").numFmt = "yyyy-mm-dd hh:mm";
  sheet.autoFilter = { from: "A1", to: "I" + Math.max(1, rows.length + 1) };
  await fs.mkdir(dataRoot, { recursive: true });
  await workbook.xlsx.writeFile(exportFile);
  return exportFile;
}

function validateRegistration(input) {
  const ticket = cleanText(input.ticket, 40);
  const name = cleanText(input.name, 80);
  const title = cleanText(input.title, 100);
  const organization = cleanText(input.organization, 160);
  const email = cleanText(input.email, 254).toLowerCase();
  const phone = cleanText(input.phone, 40);
  const dietary = cleanText(input.dietary, 20);
  const interests = Array.isArray(input.interests)
    ? [...new Set(input.interests.map(item => cleanText(item, 40)).filter(Boolean))].slice(0, 9)
    : [];
  if (!name || !title || !organization || !validEmail(email) || !phone) return { error: "請完整填寫必要欄位。" };
  if (!["內部同仁票", "企業／研究夥伴"].includes(ticket)) return { error: "報名身分無效。" };
  if (!["葷食", "素食"].includes(dietary)) return { error: "午餐需求無效。" };
  return { value: { ticket, name, title, organization, email, phone, dietary, interests } };
}

async function handleRegistration(req, res) {
  setCors(res, req);
  if (req.method !== "POST" || !sameOrigin(req) || req.headers["x-requested-with"] !== "XMLHttpRequest") {
    return sendJson(res, 403, { ok: false, message: "請從正式報名頁送出資料。" });
  }
  if (!allowRate(clientIp(req))) return sendJson(res, 429, { ok: false, message: "操作過於頻繁，請稍後再試。" });
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { ok: false, message: "資料格式不正確。" });
  }
  if (cleanText(input.website, 100)) return sendJson(res, 400, { ok: false, message: "資料無法送出。" });
  const result = validateRegistration(input);
  if (result.error) return sendJson(res, 400, { ok: false, message: result.error });
  await withWriteLock(async () => {
    const rows = await readEncryptedRows();
    const duplicate = rows.some(row => row.email === result.value.email);
    if (duplicate) throw new Error("duplicate");
    rows.push({ ...result.value, createdAt: new Date().toISOString() });
    await writeEncryptedRows(rows);
    await exportWorkbook(rows);
  }).catch(error => {
    if (error.message === "duplicate") return sendJson(res, 409, { ok: false, message: "此 Email 已完成報名，請勿重複送出。" });
    throw error;
  });
  if (!res.writableEnded) sendJson(res, 201, { ok: true, message: "報名資料已收到，後續通知請依主辦單位公告辦理。" });
}

async function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, publicOrigin).pathname);
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const resolved = path.resolve(siteRoot, relative);
  if (!resolved.startsWith(siteRoot + path.sep)) return sendJson(res, 400, { ok: false, message: "Bad request" });
  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) throw new Error("not-file");
    const ext = path.extname(resolved).toLowerCase();
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
    securityHeaders(res);
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "HEAD") return res.end();
    res.end(await fs.readFile(resolved));
  } catch {
    sendJson(res, 404, { ok: false, message: "Not found" });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS" && req.headers.origin === publicOrigin) {
      setCors(res, req);
      res.writeHead(204);
      return res.end();
    }
    if (!allowedMethods.has(req.method)) return sendJson(res, 405, { ok: false, message: "Method not allowed" });
    if (req.url?.split("?")[0] === "/api/registrations" && req.method === "POST") return await handleRegistration(req, res);
    if (req.url?.split("?")[0] === "/admin/export.xlsx" && req.method === "GET") {
      const token = req.headers["x-admin-token"];
      if (token !== adminToken) return sendJson(res, 401, { ok: false, message: "Unauthorized" });
      const rows = await readEncryptedRows();
      await exportWorkbook(rows);
      const file = await fs.readFile(exportFile);
      securityHeaders(res);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=registrations.xlsx");
      res.setHeader("Cache-Control", "no-store");
      return res.end(file);
    }
    return await serveStatic(req, res);
  } catch (error) {
    console.error("request_failed", error.message);
    if (!res.writableEnded) sendJson(res, 500, { ok: false, message: "伺服器暫時無法處理，請稍後再試。" });
  }
});

server.listen(port, "0.0.0.0", () => console.log(`Registration server listening on ${publicOrigin}`));


