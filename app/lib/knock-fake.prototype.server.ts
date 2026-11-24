// PROTOTYPE, throwaway (wayfinder ticket "Does Knock hold up against Cadence?").
// In-memory stand-in for the Knock API, because we have no Knock account.
// It mimics only the endpoints the four checks need, shaped after Knock's docs.
// A green run here proves OUR side (token signing, SDK call sites, payloads),
// not Knock's behaviour. Wipe me once the vendor question is settled.
import http from "node:http";
import crypto from "node:crypto";

export const FAKE_PORT = 4799;
export const FAKE_BASE_URL = `http://localhost:${FAKE_PORT}`;
export const FAKE_SECRET_KEY = "sk_test_FAKE";
export const FAKE_PUBLIC_KEY = "pk_test_FAKE";
export const FEED_CHANNEL_ID = "fake-feed-channel";

type Message = {
  id: string;
  recipient: string;
  workflow: string;
  category: string;
  actor: string | null;
  data: Record<string, unknown>;
  inserted_at: string;
  read_at: string | null;
  seen_at: string | null;
};

// Workflow key -> category, as it would be set up in the Knock dashboard.
const WORKFLOW_CATEGORIES: Record<string, string> = {
  "discussion-reply": "discussion",
  "new-enrollment": "new-enrollment",
};

// Environment default preference set (Knock: dashboard "default preferences").
// new-enrollment in-app is OFF for everyone until a user opts in.
const DEFAULT_PREFS = {
  categories: {
    discussion: { channel_types: { in_app_feed: true, email: true } },
    "new-enrollment": { channel_types: { in_app_feed: false, email: false } },
  } as Record<string, { channel_types: Record<string, boolean> }>,
};

type State = {
  server: http.Server;
  signingKey: string; // private PEM, what KNOCK_SIGNING_KEY would hold
  publicKey: crypto.KeyObject; // what Knock keeps to verify user tokens
  messages: Message[];
  userPrefs: Map<string, typeof DEFAULT_PREFS>;
  log: string[];
};

const g = globalThis as unknown as { __knockFake?: State };

export function getKnockFake(): State {
  if (g.__knockFake) return g.__knockFake;
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const state: State = {
    server: http.createServer((req, res) => handle(state, req, res)),
    signingKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey,
    messages: [],
    userPrefs: new Map(),
    log: [],
  };
  state.server.listen(FAKE_PORT);
  g.__knockFake = state;
  return state;
}

function effectivePrefs(s: State, userId: string) {
  const own = s.userPrefs.get(userId);
  // Knock merges the user's set over the default set; user values win.
  const merged = structuredClone(DEFAULT_PREFS);
  for (const [cat, v] of Object.entries(own?.categories ?? {})) {
    merged.categories[cat] = {
      channel_types: { ...merged.categories[cat]?.channel_types, ...v.channel_types },
    };
  }
  return merged;
}

// Minimal RS256 JWT verify, like Knock does with the uploaded signing key.
function verifyUserToken(s: State, token: string | undefined): string | null {
  if (!token) return null;
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) return null;
  const ok = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${h}.${p}`),
    s.publicKey,
    Buffer.from(sig, "base64url"),
  );
  if (!ok) return null;
  const header = JSON.parse(Buffer.from(h, "base64url").toString());
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  if (header.alg !== "RS256") return null;
  if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return null;
  return String(claims.sub);
}

async function body(req: http.IncomingMessage) {
  let raw = "";
  for await (const c of req) raw += c;
  return raw ? JSON.parse(raw) : {};
}

function send(res: http.ServerResponse, status: number, json: unknown) {
  res.writeHead(status, { "content-type": "application/json", ...cors });
  res.end(JSON.stringify(json));
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-knock-user-token",
  "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
};

async function handle(s: State, req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === "OPTIONS") return send(res, 204, null);
  const url = new URL(req.url ?? "/", FAKE_BASE_URL);
  const auth = req.headers.authorization?.replace(/^Bearer /, "");
  const tokenUser = verifyUserToken(s, req.headers["x-knock-user-token"] as string | undefined);
  const line = `${req.method} ${url.pathname}${url.search}`;
  s.log.unshift(`${new Date().toLocaleTimeString()} ${line}`);
  s.log.length = Math.min(s.log.length, 30);

  // --- Server side, secret key: trigger a workflow (Node SDK workflows.trigger)
  let m = url.pathname.match(/^\/v1\/workflows\/([^/]+)\/trigger$/);
  if (m && req.method === "POST") {
    if (auth !== FAKE_SECRET_KEY) return send(res, 401, { code: "invalid_api_key" });
    const { recipients, actor, data } = await body(req);
    const workflow = m[1];
    const category = WORKFLOW_CATEGORIES[workflow];
    if (!category) return send(res, 404, { code: "workflow_not_found" });
    for (const r of recipients as Array<string | { id: string }>) {
      const recipient = typeof r === "string" ? r : r.id;
      if (!effectivePrefs(s, recipient).categories[category]?.channel_types.in_app_feed) {
        s.log.unshift(`  skipped ${recipient}: ${category} in_app_feed off by preference`);
        continue;
      }
      s.messages.push({
        id: crypto.randomUUID(),
        recipient,
        workflow,
        category,
        actor: actor ? String(typeof actor === "string" ? actor : actor.id) : null,
        data: data ?? {},
        inserted_at: new Date().toISOString(),
        read_at: null,
        seen_at: null,
      });
    }
    return send(res, 200, { workflow_run_id: crypto.randomUUID() });
  }

  // Everything below is client side: public key + signed user token.
  if (auth !== FAKE_PUBLIC_KEY && auth !== FAKE_SECRET_KEY)
    return send(res, 401, { code: "invalid_api_key" });
  if (auth === FAKE_PUBLIC_KEY && !req.headers["x-knock-user-token"])
    return send(res, 401, { code: "missing_user_token" });
  if (auth === FAKE_PUBLIC_KEY && !tokenUser)
    return send(res, 401, { code: "invalid_user_token" });
  const may = (userId: string) => auth === FAKE_SECRET_KEY || tokenUser === userId;

  // GET /v1/users/:id/feeds/:channel_id
  m = url.pathname.match(/^\/v1\/users\/([^/]+)\/feeds\/([^/]+)$/);
  if (m && req.method === "GET") {
    if (!may(m[1])) return send(res, 403, { code: "user_token_mismatch" });
    const mine = s.messages.filter((x) => x.recipient === m![1]);
    return send(res, 200, {
      entries: [...mine].reverse(),
      meta: {
        unread_count: mine.filter((x) => !x.read_at).length,
        unseen_count: mine.filter((x) => !x.seen_at).length,
        total_count: mine.length,
      },
      page_info: { after: null, before: null, page_size: 50 },
    });
  }

  // POST /v1/messages/batch/read | seen  { message_ids: [] }
  m = url.pathname.match(/^\/v1\/messages\/batch\/(read|seen)$/);
  if (m && req.method === "POST") {
    const { message_ids } = await body(req);
    const field = m[1] === "read" ? "read_at" : "seen_at";
    const touched = s.messages.filter((x) => message_ids.includes(x.id) && may(x.recipient));
    for (const x of touched) x[field] = new Date().toISOString();
    return send(res, 200, touched);
  }

  // GET/PUT /v1/users/:id/preferences/default
  m = url.pathname.match(/^\/v1\/users\/([^/]+)\/preferences\/default$/);
  if (m) {
    if (!may(m[1])) return send(res, 403, { code: "user_token_mismatch" });
    if (req.method === "PUT") s.userPrefs.set(m[1], await body(req));
    return send(res, 200, effectivePrefs(s, m[1]));
  }

  send(res, 404, { code: "not_found", path: url.pathname });
}
