const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const API = "https://api.github.com";
const BAD_HOSTS = new Set(["bit.ly", "tinyurl.com", "t.co", "localhost"]);
const LINK_FIELDS = ["nexus_url", "source_url", "discord_url", "wiki_url"];
const RECORD_FIELDS = new Set([
  "id", "name", "kind", "state", "compatibility", "archive_terms", ...LINK_FIELDS,
  "note", "releases", "game_scope"
]);
const COMMENT_KINDS = new Set(["compatibility", "conflict", "dependency", "install-note", "correction"]);

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const clean = (value, max) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
function bytesToBase64(bytes, url = false) {
  let text = ""; for (const byte of bytes) text += String.fromCharCode(byte);
  const result = btoa(text); return url ? result.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "") : result;
}
const text64 = (text, url = false) => bytesToBase64(new TextEncoder().encode(text), url);
function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !BAD_HOSTS.has(url.hostname.toLowerCase()) && !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname); } catch (_) { return false; }
}
const toxic = (text) => /\b(?:fuck\s*you|kys|kill\s*yourself|nigg(?:er|a))\b/i.test(text);
const headers = (token) => ({ accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "user-agent": "Package-Daddy-Catalog-Publisher", "x-github-api-version": "2026-03-10" });
async function github(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...headers(token), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub answered ${response.status}`);
  return data;
}
function pemBytes(pem) {
  const raw = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ""));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0)).buffer;
}
async function installationToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const head = text64(JSON.stringify({ alg: "RS256", typ: "JWT" }), true);
  const claim = text64(JSON.stringify({ iat: now - 30, exp: now + 540, iss: env.GITHUB_APP_ID }), true);
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(env.GITHUB_APP_PRIVATE_KEY), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${claim}`));
  const jwt = `${head}.${claim}.${bytesToBase64(new Uint8Array(sig), true)}`;
  const install = await github(`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}/installation`, jwt);
  if (!install.id) throw new Error("GitHub could not find this app's installation for the catalog repository.");
  const issued = await github(`/app/installations/${install.id}/access_tokens`, jwt, { method: "POST" });
  if (!issued.token) throw new Error("GitHub did not return an installation token.");
  return issued.token;
}

function validate(input) {
  const problems = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) return [null, ["Submission is not an object."]];
  if (input.schema_version !== 1) problems.push("Daddy and the publisher disagree on the submission format.");
  if (!new Set(["add", "update", "comment"]).has(input.operation)) problems.push("That submission operation is not supported.");
  if (input.local_review?.verdict !== "passed-local-review") problems.push("Daddy did not pass this form locally.");
  const raw = input.record || {}; const record = {};
  if (typeof raw !== "object" || Array.isArray(raw)) problems.push("No catalog record came with the submission.");
  for (const key of Object.keys(raw)) if (!RECORD_FIELDS.has(key)) problems.push(`Record field '${key}' is not publishable.`);
  record.id = clean(raw.id, 80).toLowerCase(); record.name = clean(raw.name, 160); record.kind = clean(raw.kind, 30);
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(record.id)) problems.push("Catalog ID must be lowercase words joined with hyphens.");
  if (record.name.length < 2 || toxic(record.name)) problems.push("Project name is missing or contains rejected text.");
<<<<<<< Updated upstream
  if (!new Set(["mo2-plugin", "mo2-tool", "mo2-theme", "mo2-mod"]).has(record.kind)) problems.push("Kind must be an MO2 plugin, tool, theme, or mod.");
=======
  if (!new Set(["mo2-plugin", "mo2-tool", "mo2-theme", "mo2-resource"]).has(record.kind)) problems.push("Kind must be an MO2 plugin, tool, theme, or mod author resource.");
>>>>>>> Stashed changes
  if (Array.isArray(raw.archive_terms)) record.archive_terms = [...new Set(raw.archive_terms.map((item) => clean(item, 48).toLowerCase()).filter((item) => item.length >= 2))].slice(0, 12);
  if (raw.state) record.state = clean(raw.state, 32);
  if (raw.compatibility) record.compatibility = clean(raw.compatibility, 32);
  if (Array.isArray(raw.game_scope)) record.game_scope = [...new Set(raw.game_scope.map((item) => clean(item, 48)).filter(Boolean))].slice(0, 24);
  if (Array.isArray(raw.releases)) record.releases = raw.releases.slice(0, 16);
  for (const key of LINK_FIELDS) if (raw[key]) { const url = clean(raw[key], 500); if (!safeUrl(url)) problems.push(`${key} must be a real HTTPS URL, not a shortener or local address.`); else record[key] = url; }
  if (raw.note) { record.note = clean(raw.note, 700); if (record.note.length < 4 || toxic(record.note)) problems.push("Catalog note is empty or contains rejected text."); }
  if (input.operation === "add") { if (!record.archive_terms?.length) problems.push("A new record needs at least one archive term."); if (!LINK_FIELDS.some((key) => record[key])) problems.push("A new record needs an official HTTPS project link."); }
  let comment = null;
  if (input.operation === "comment") {
    const rawComment = input.comment || {}; const kind = clean(rawComment.kind, 32); const text = clean(rawComment.text, 500); const evidence_url = clean(rawComment.evidence_url, 500);
    const related_package_ids = Array.isArray(rawComment.related_package_ids) ? [...new Set(rawComment.related_package_ids.map((item) => clean(item, 80).toLowerCase()).filter((item) => /^[a-z0-9][a-z0-9-]{1,79}$/.test(item)))].slice(0, 6) : [];
    if (!COMMENT_KINDS.has(kind)) problems.push("That comment type is not supported.");
    if (text.length < 4 || toxic(text)) problems.push("Comment text is missing or contains rejected text.");
    if (!safeUrl(evidence_url)) problems.push("Comments need a real HTTPS evidence link.");
    comment = { kind, text, evidence_url, related_package_ids };
  }
  return [{ operation: input.operation, record, comment }, problems];
}

function merge(catalog, submission, submitter) {
  if (!catalog || !Array.isArray(catalog.packages)) throw new Error("The published catalog is malformed. Nothing was changed.");
  const index = catalog.packages.findIndex((entry) => entry && entry.id === submission.record.id);
  if (submission.operation === "add") {
    if (index >= 0) throw new Error("That catalog ID already exists. Refresh Daddy and submit an update instead.");
    catalog.packages.push({ ...submission.record, compatibility: "unknown" });
  } else if (index < 0) throw new Error("That catalog record disappeared. Refresh Daddy before changing it.");
  else if (submission.operation === "update") {
    const old = catalog.packages[index]; const next = { ...old };
    for (const [key, value] of Object.entries(submission.record)) if (key !== "id" && value !== "" && (!Array.isArray(value) || value.length)) next[key] = value;
    if (old.compatibility) next.compatibility = old.compatibility;
    catalog.packages[index] = next;
  } else {
    const old = catalog.packages[index]; const entry = { ...submission.comment, author: submitter.login, submitted_at: new Date().toISOString() };
    const comments = Array.isArray(old.comments) ? old.comments.filter((item) => !(item && item.author === submitter.login && item.kind === entry.kind)) : [];
    comments.push(entry); catalog.packages[index] = { ...old, comments };
  }
  catalog.packages.sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  return catalog;
}

async function publish(request, env) {
  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return reply(401, { error: "Sign in to GitHub through Daddy before submitting catalog facts." });
  let submitter; try { submitter = await github("/user", auth.slice(7).trim()); } catch (_) { return reply(401, { error: "GitHub did not accept that contributor login. Sign in again in Daddy." }); }
  let body; try { body = await request.json(); } catch (_) { return reply(400, { error: "Submission body was not JSON." }); }
  // Catalog comments are human attribution, not automated narration.  GitHub
  // tells us when the authenticated contributor is a bot, so reject it before
  // the submission reaches the shared catalog.
  if (body?.operation === "comment" && String(submitter?.type || "").toLowerCase() === "bot") {
    return reply(403, { error: "Catalog comments must come from a human GitHub account." });
  }
  const [submission, problems] = validate(body); if (problems.length) return reply(422, { error: "Daddy's form needs fixing.", problems });
  try {
    const token = await installationToken(env); const repo = `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPOSITORY}`;
    const remote = await github(`${repo}/contents/${env.CATALOG_PATH}?ref=main`, token);
    const binary = atob(String(remote.content || "").replace(/\s/g, "")); const catalog = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    const next = merge(catalog, submission, submitter); const content = text64(JSON.stringify(next, null, 2) + "\n");
    const verb = submission.operation === "add" ? "add" : submission.operation;
    const message = `catalog: ${verb} ${submission.record.id} (via @${submitter.login})`;
    const committed = await github(`${repo}/contents/${env.CATALOG_PATH}`, token, { method: "PUT", body: JSON.stringify({ message, content, sha: remote.sha, branch: "main" }) });
    return reply(201, { ok: true, commit: committed.commit?.html_url || null, submitted_by: submitter.login });
  } catch (error) { return reply(409, { error: error instanceof Error ? error.message : "Publisher failed without changing the catalog." }); }
}

export default { async fetch(request, env) {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") return reply(200, { ok: true, service: "package-daddy-catalog-publisher" });
  if (request.method === "POST" && url.pathname === "/v1/submissions") return publish(request, env);
  return reply(404, { error: "Nothing useful lives here." });
} };
