// PROTOTYPE, throwaway (wayfinder ticket "Does Knock hold up against Cadence?").
// Drives the four checks against the in-memory Knock fake. Not a Feed design.
import { useCallback, useEffect, useState } from "react";
import { Form, useRevalidator } from "react-router";
import Knock, { signUserToken } from "@knocklabs/node";
import type { Route } from "./+types/prototype.knock";
import { db } from "~/db";
import { users } from "~/db/schema";
import { getCurrentUserId } from "~/lib/session";
import {
  getKnockFake,
  FAKE_BASE_URL,
  FAKE_SECRET_KEY,
} from "~/lib/knock-fake.prototype.server";

function knock() {
  // The real SDK, pointed at the fake instead of api.knock.app.
  return new Knock({ apiKey: FAKE_SECRET_KEY, baseURL: FAKE_BASE_URL });
}

export async function loader({ request }: Route.LoaderArgs) {
  const fake = getKnockFake();
  const userId = await getCurrentUserId(request);
  const allUsers = db.select({ id: users.id, name: users.name, role: users.role }).from(users).all();
  // Check 1: server signs an RS256 user token for whoever the DevUI selected.
  const userToken = userId
    ? await signUserToken(String(userId), { signingKey: fake.signingKey, expiresInSeconds: 3600 })
    : null;
  return { userId, userToken, allUsers, log: fake.log, messages: fake.messages };
}

export async function action({ request }: Route.ActionArgs) {
  getKnockFake();
  const userId = await getCurrentUserId(request);
  const form = await request.formData();
  const recipient = String(form.get("recipient"));
  const workflow = String(form.get("workflow"));
  // Check 2: trigger a catalogue Notification through the Node SDK.
  await knock().workflows.trigger(workflow, {
    recipients: [recipient],
    actor: userId ? String(userId) : null,
    data:
      workflow === "discussion-reply"
        ? { lesson_title: "Intro to Loaders", reply_excerpt: "Good question! The loader runs on…" }
        : { course_title: "Advanced React Router" },
  });
  return null;
}

type FeedItem = {
  id: string;
  workflow: string;
  actor: string | null;
  data: Record<string, string>;
  read_at: string | null;
  seen_at: string | null;
};
type Feed = { entries: FeedItem[]; meta: { unread_count: number; unseen_count: number } };

export default function KnockPrototype({ loaderData }: Route.ComponentProps) {
  const { userId, userToken, allUsers, log, messages } = loaderData;
  const revalidator = useRevalidator();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [prefs, setPrefs] = useState<unknown>(null);
  const [probe, setProbe] = useState<string>("");

  // Browser -> "Knock" directly, public key + user token, like @knocklabs/client.
  const call = useCallback(
    async (path: string, init?: RequestInit, token: string | null = userToken) => {
      const res = await fetch(`${FAKE_BASE_URL_CLIENT}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${FAKE_PUBLIC_KEY_CLIENT}`,
          "content-type": "application/json",
          ...(token ? { "x-knock-user-token": token } : {}),
        },
      });
      return { status: res.status, json: await res.json().catch(() => null) };
    },
    [userToken],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    const f = await call(`/v1/users/${userId}/feeds/${FEED_CHANNEL_ID_CLIENT}`);
    setFeed(f.status === 200 ? f.json : null);
    setPrefs((await call(`/v1/users/${userId}/preferences/default`)).json);
    revalidator.revalidate();
  }, [call, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFeed(null);
    void refresh();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const mark = async (kind: "read" | "seen", ids: string[]) => {
    await call(`/v1/messages/batch/${kind}`, { method: "POST", body: JSON.stringify({ message_ids: ids }) });
    await refresh();
  };

  const setEnrollmentOptIn = async (on: boolean) => {
    await call(`/v1/users/${userId}/preferences/default`, {
      method: "PUT",
      body: JSON.stringify({
        categories: { "new-enrollment": { channel_types: { in_app_feed: on, email: false } } },
      }),
    });
    await refresh();
  };

  const runProbes = async () => {
    const other = allUsers.find((u) => u.id !== userId)!;
    const a = await call(`/v1/users/${other.id}/feeds/${FEED_CHANNEL_ID_CLIENT}`);
    const b = await call(`/v1/users/${userId}/feeds/${FEED_CHANNEL_ID_CLIENT}`, undefined, null);
    const c = await call(`/v1/users/${userId}/feeds/${FEED_CHANNEL_ID_CLIENT}`, undefined, userToken + "x");
    setProbe(
      `my token on ${other.name}'s feed → ${a.status} ${a.json?.code}\n` +
        `no token → ${b.status} ${b.json?.code}\n` +
        `tampered token → ${c.status} ${c.json?.code}`,
    );
  };

  const name = (id: string | null) => allUsers.find((u) => String(u.id) === id)?.name ?? id;
  const enrollmentOn = (prefs as any)?.categories?.["new-enrollment"]?.channel_types?.in_app_feed;

  if (!userId) return <p className="p-8">Select a user in the DevUI panel.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8 font-mono text-sm">
      <div className="rounded border-2 border-dashed border-amber-500 p-3">
        PROTOTYPE against an in-memory Knock fake ({FAKE_BASE_URL_CLIENT}). Real @knocklabs/node SDK,
        real RS256 tokens, fake server. Proves Cadence&apos;s side only.
      </div>

      <section>
        <h2 className="font-bold">1 · Signed user token (current DevUI user: {name(String(userId))})</h2>
        <pre className="break-all whitespace-pre-wrap text-xs text-muted-foreground">
          {userToken}
          {"\n"}claims: {userToken && atob(userToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))}
        </pre>
        <button className="mt-2 rounded border px-2 py-1" onClick={runProbes}>
          Probe: other user&apos;s feed / no token / tampered token
        </button>
        {probe && <pre className="mt-2 whitespace-pre-wrap">{probe}</pre>}
      </section>

      <section>
        <h2 className="font-bold">2 · Trigger via Node SDK (actor = current user)</h2>
        <div className="flex flex-wrap gap-4">
          {(["discussion-reply", "new-enrollment"] as const).map((wf) => (
            <Form method="post" key={wf} className="flex gap-2" onSubmit={() => setTimeout(refresh, 300)}>
              <input type="hidden" name="workflow" value={wf} />
              <select name="recipient" className="rounded border bg-background px-1">
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <button className="rounded border px-2 py-1">trigger {wf}</button>
            </Form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold">
          3 · Headless feed for {name(String(userId))} · unread {feed?.meta.unread_count ?? "?"} · unseen{" "}
          {feed?.meta.unseen_count ?? "?"}
        </h2>
        <div className="my-2 flex gap-2">
          <button className="rounded border px-2 py-1" onClick={refresh}>refresh</button>
          <button className="rounded border px-2 py-1" onClick={() => mark("seen", feed!.entries.map((e) => e.id))}>
            mark all seen
          </button>
          <button className="rounded border px-2 py-1" onClick={() => mark("read", feed!.entries.map((e) => e.id))}>
            mark all read
          </button>
        </div>
        <ul className="space-y-1">
          {feed?.entries.map((e) => (
            <li key={e.id} className={e.read_at ? "opacity-50" : "font-semibold"}>
              {e.seen_at ? "  " : "● "}[{e.workflow}] from {name(e.actor)}:{" "}
              {e.data.reply_excerpt ?? e.data.course_title}{" "}
              {!e.read_at && (
                <button className="underline" onClick={() => mark("read", [e.id])}>
                  read
                </button>
              )}
            </li>
          ))}
          {feed?.entries.length === 0 && <li>(empty)</li>}
        </ul>
      </section>

      <section>
        <h2 className="font-bold">4 · Preferences (new-enrollment is off by default)</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!enrollmentOn} onChange={(e) => setEnrollmentOptIn(e.target.checked)} />
          Notify me about new Enrollments (in-app)
        </label>
        <pre className="mt-2 text-xs">{JSON.stringify(prefs, null, 1)}</pre>
      </section>

      <section>
        <h2 className="font-bold">Fake Knock state</h2>
        <pre className="max-h-64 overflow-auto text-xs">{log.join("\n")}</pre>
        <pre className="max-h-64 overflow-auto text-xs">
          {JSON.stringify(messages.map((m) => ({ to: name(m.recipient), wf: m.workflow, read: !!m.read_at, seen: !!m.seen_at })), null, 0)}
        </pre>
      </section>
    </div>
  );
}

// Client-side copies: the .server module can't be imported into the bundle.
const FAKE_BASE_URL_CLIENT = "http://localhost:4799";
const FAKE_PUBLIC_KEY_CLIENT = "pk_test_FAKE";
const FEED_CHANNEL_ID_CLIENT = "fake-feed-channel";
