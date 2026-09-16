import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSystemPrompt } from "./prompt";
import { assessmentSchema, finalizeAssessment } from "./schema";
import { buildTools, type ToolContext } from "./tools";
import type { Assessment, LookupLog } from "./types";

export const MODEL = "claude-opus-5";

export interface AssessInput {
  supabase: SupabaseClient;
  senderEmail: string;
  senderName: string | null;
  mailbox: string;
  displayName: string;
  subject: string;
  /** Earlier messages in the thread, oldest first. The latest customer mail goes in `latest`. */
  thread: { sender: "customer" | "staff"; body: string; created_at: string }[];
  latest: string;
}

export interface AssessOutput {
  assessment: Assessment;
  lookups: LookupLog[];
  usage: { input: number; output: number };
  model: string;
}

function userMessage(input: AssessInput): string {
  const history = input.thread
    .slice(-10)
    .map(
      (m) =>
        `[${m.sender === "staff" ? "PhoneSpot" : "Kunde"} · ${m.created_at.slice(0, 16)}]\n${m.body.slice(0, 3000)}`,
    )
    .join("\n\n");
  return [
    `Postkasse: ${input.mailbox}`,
    `Afsender: ${input.senderName ?? "(ukendt navn)"} <${input.senderEmail || "ukendt"}>`,
    `Emne: ${input.subject || "(intet emne)"}`,
    history ? `\nTidligere i tråden:\n${history}` : "",
    `\n<kundens_mail>\n${input.latest.slice(0, 12000)}\n</kundens_mail>`,
    "\nVurder mailen og kald submit_assessment.",
  ]
    .filter(Boolean)
    .join("\n");
}

const FALLBACK: Assessment = {
  category: "andet",
  needs_human: true,
  reason: "Assistenten kunne ikke vurdere mailen.",
  summary: "Mail der kræver manuel gennemgang",
  confidence: 0,
  draft: null,
};

let defaultClient: Anthropic | null = null;
function client(): Anthropic {
  if (!defaultClient) defaultClient = new Anthropic();
  return defaultClient;
}

/**
 * Runs the tool loop for one customer mail and returns a validated assessment.
 * Never throws on a bad model answer; SDK errors (auth, rate limit) propagate
 * so the orchestrator can decide whether to stop the run.
 */
export async function assessMessage(input: AssessInput, anthropic: Anthropic = client()): Promise<AssessOutput> {
  const ctx: ToolContext = {
    supabase: input.supabase,
    senderEmail: input.senderEmail,
    log: [],
    scopeMismatch: { value: false },
  };
  let submitted: unknown = null;
  const tools = buildTools(ctx, (a) => {
    submitted = a;
  });
  const usage = { input: 0, output: 0 };

  const params = {
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" as const },
    output_config: { effort: "medium" as const },
    system: [
      {
        type: "text" as const,
        text: buildSystemPrompt({ mailbox: input.mailbox, displayName: input.displayName }),
        cache_control: { type: "ephemeral" as const },
      },
    ],
    tools,
    messages: [{ role: "user" as const, content: userMessage(input) }],
    max_iterations: 10,
  };

  const runner = anthropic.beta.messages.toolRunner(params);
  for await (const message of runner) {
    usage.input +=
      (message.usage.input_tokens ?? 0) +
      (message.usage.cache_read_input_tokens ?? 0) +
      (message.usage.cache_creation_input_tokens ?? 0);
    usage.output += message.usage.output_tokens ?? 0;
  }

  if (!submitted) {
    // One nudge with the explicit instruction, then give up and hand to a human.
    const retry = anthropic.beta.messages.toolRunner({
      ...params,
      messages: [
        ...runner.params.messages,
        { role: "user" as const, content: "Du mangler at kalde submit_assessment. Gør det nu med din vurdering." },
      ],
      max_iterations: 3,
    });
    for await (const message of retry) {
      usage.input += message.usage.input_tokens ?? 0;
      usage.output += message.usage.output_tokens ?? 0;
    }
  }

  const parsed = assessmentSchema.safeParse(submitted);
  const assessment = finalizeAssessment(parsed.success ? parsed.data : FALLBACK, {
    scopeMismatch: ctx.scopeMismatch.value,
  });
  return { assessment, lookups: ctx.log, usage, model: MODEL };
}
