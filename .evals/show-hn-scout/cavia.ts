// Cavia client for this eval: one real Cavia task per (case, rep). Adapted from the cavia-agent skill's
// references/run-agent.ts so the eval is self-contained. The agent is the variant directory's
// system-prompt.md + request.json; the model and the prompt are per-run inputs.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Usage = Record<string, number>;
export type Message = {
  id?: string;
  role: string;
  parts?: any[];
  metadata?: { stop_reason?: string; usage?: Usage };
};
export type TaskRun = {
  task_id: string;
  model: string;
  stop_reason: string | null;
  error: string | null; // "timeout" | task last_error message | null
  usage?: Usage; // task total; 0 can mean "not reported"
  transcript: Message[];
};
export type RunTask = (agent: object, model: string, prompt: string, timeoutMs: number) => Promise<TaskRun>;

const base = new URL(process.env.CAVIA_BASE_URL ?? "https://cavia.tabbyml.workers.dev");

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(path, base), { headers: { "content-type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function loadAgent(dir: string): { agent: Record<string, any>; files: string[] } {
  const request = join(dir, "request.json");
  const cfg = existsSync(request) ? JSON.parse(readFileSync(request, "utf8")) : {};
  const skillsDir = join(dir, "skills");
  const localSkills = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => {
          const root = join(skillsDir, d.name);
          const files = Object.fromEntries(
            readdirSync(root, { withFileTypes: true, recursive: true })
              .filter((f) => f.isFile() && !f.name.startsWith("."))
              .map((f) => [join(f.parentPath, f.name).slice(root.length + 1), readFileSync(join(f.parentPath, f.name), "utf8")]),
          );
          return { files };
        })
    : [];
  for (const k of ["model", "system_prompt", "prompt"]) if (k in cfg) throw new Error(`request.json must not set ${k}`);
  const skills = [...(cfg.skills ?? []), ...localSkills];
  return {
    agent: { ...cfg, system_prompt: readFileSync(join(dir, "system-prompt.md"), "utf8"), ...(skills.length ? { skills } : {}) },
    files: ["system-prompt.md", ...(existsSync(request) ? ["request.json"] : [])],
  };
}

type State = { status: "running" | "idle"; usage?: Usage; last_error: { message: string } | null };

/**
 * Wait for the task's state to read `idle`. Uses the task's own WebSocket (the same /v1/tasks/:id feed the
 * reference run-agent.ts reads through `agents/client`; that client fails under Bun 1.2.18 with
 * "'blob' is not a valid value for binaryType"). The current state is pushed on every connect, so a
 * reconnect after a drop recovers a turn that finished in the meantime.
 */
export function waitIdle(taskId: string, timeoutMs: number): Promise<{ timedOut: boolean; state?: State }> {
  return new Promise((resolve) => {
    let state: State | undefined;
    let ws: WebSocket | undefined;
    let finished = false;
    const finish = (timedOut: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try { ws?.close(); } catch {}
      resolve({ timedOut, state });
    };
    const timer = setTimeout(finish, timeoutMs, true);
    let reconnects = 0;
    const connect = () => {
      ws = new WebSocket(`${base.protocol === "https:" ? "wss" : "ws"}://${base.host}/v1/tasks/${taskId}`);
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(String(e.data));
          if (m.type === "cf_agent_state" && m.state) {
            state = m.state;
            if (state?.status === "idle") finish(false);
          }
        } catch {}
      };
      ws.onclose = () => { if (!finished && reconnects++ < 20) setTimeout(connect, 1000); };
      ws.onerror = () => {};
    };
    connect();
  });
}

export const runCaviaTask: RunTask = async (agent, model, prompt, timeoutMs) => {
  const { task_id } = await api<{ task_id: string }>("/v1/tasks", { method: "POST", body: JSON.stringify({ ...agent, model, prompt }) });
  // On timeout the ceiling reclaims the worker slot; the task itself keeps running server-side.
  const { timedOut, state } = await waitIdle(task_id, timeoutMs);
  const transcript = await api<Message[]>(`/v1/tasks/${task_id}/transcript`);
  return {
    task_id,
    model,
    stop_reason: transcript.findLast((m) => m.role === "assistant")?.metadata?.stop_reason ?? null,
    error: timedOut ? "timeout" : (state?.last_error?.message ?? null),
    usage: state?.usage,
    transcript,
  };
};
