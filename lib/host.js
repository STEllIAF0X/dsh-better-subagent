/**
 * dsh-better-subagent — Host half.
 *
 * Two improvements over the shipped delegation surface, mounted from one
 * profile-level plugin:
 *
 * 1. **Default child route.** The shipped Subagent settings page can authorize
 *    WHICH models an agent may pick for a subagent, but it has no say over the
 *    case where the agent names no model at all: the runtime then inherits the
 *    delegating agent's own route (`resolveChildAgentOptions` overlays the
 *    request's `agentOptions` on the parent's latest request). This half owns one
 *    editable settings namespace (`dsh-better-subagent`, rendered by
 *    `./client.js`) and overlays the configured route onto every delegation start
 *    whose child options name no route.
 *
 *    Precedence, highest first:
 *      1. the model's own `provider`/`model` arguments on the delegation call
 *      2. a tool instance's configured `agentOptions` (e.g. a preset row)
 *      3. this plugin's configured default (only while `enabled`)
 *      4. the delegating agent's route (the runtime's inheritance)
 *
 * 2. **A blocking wait.** Background children report through a settlement notice
 *    (continuable) or a job (one-shot), but nothing lets an agent *block* on a
 *    delegated result, so models invent `sleep`/poll jobs to wait. This half
 *    registers a globally visible `wait_subagents` tool that returns as soon as
 *    the named children (or every working child of the caller) stop working, plus
 *    a prompt section telling the model never to sleep or poll for a subagent.
 *
 * The route seam is `ctx.subagents`: every in-process delegation (one-shot,
 * background and continuable, spawn and fork alike) enters through `start()` /
 * `startContinuable()` and carries the resolved child options in its request.
 * Those two methods are wrapped for as long as this plugin is mounted and
 * restored on disposal.
 *
 * @module dsh-better-subagent
 */
import z from '@deepseek-ai/schemastery'
import { setTimeout as delay } from 'node:timers/promises'

export const name = 'dsh-better-subagent'
export const inject = ['subagents']

/**
 * Settings schema. Every field is volatile so the Subagent settings page can
 * edit it live through the profile patch without remounting this plugin.
 */
export const Config = z.object({
  enabled: z.boolean().default(false).volatile(),
  provider: z.string().default('').volatile(),
  model: z.string().default('').volatile(),
  reasoningEffort: z.string().default('').volatile(),
  includeForkChildren: z.boolean().default(true).volatile(),
  waitTool: z.boolean().default(true).volatile()
})

/**
 * Read the live preference. Volatile config fields are reference objects, so
 * each read observes the current profile value.
 * @param config - this plugin's resolved Config.
 * @returns the detached preference.
 */
export function readPreference(config) {
  const effort = config.reasoningEffort.get()
  const provider = config.provider.get()
  const model = config.model.get()
  return {
    enabled: config.enabled.get() === true,
    provider: typeof provider === 'string' ? provider : '',
    model: typeof model === 'string' ? model : '',
    reasoningEffort: typeof effort === 'string' && effort.length > 0 ? effort : undefined,
    includeForkChildren: config.includeForkChildren.get() !== false,
    waitTool: config.waitTool?.get() !== false
  }
}

/**
 * Overlay the configured default route onto one delegation request.
 *
 * A request that already names both `provider` and `model` is returned
 * untouched: that is an explicit choice (the model's own arguments, or a tool
 * instance's configured `agentOptions`) and always wins. A provider that does
 * not advertise the `agentOptions` capability is left alone, so this plugin can
 * never turn a working delegation into a capability error.
 *
 * @param ctx - the plugin context, used for the provider registry and logging.
 * @param config - this plugin's resolved Config.
 * @param providerName - the subagent provider the start was addressed to.
 * @param request - the caller's start request.
 * @returns the request to hand to the real start, with `agentOptions` filled in
 *   when this plugin owns the route.
 */
export function withDefaultRoute(ctx, config, providerName, request) {
  const preference = readPreference(config)
  if (!preference.enabled || preference.provider.length === 0 || preference.model.length === 0) return request
  const provider = ctx.subagents.getProvider(providerName)
  if (provider === undefined) return request
  if (provider.capabilities?.agentOptions !== true) return request
  if (provider.inheritsParentContext === true && !preference.includeForkChildren) return request
  const current = request.agentOptions
  if (current?.provider !== undefined && current?.model !== undefined) return request
  const agentOptions = {
    ...current,
    provider: preference.provider,
    model: preference.model
  }
  if (preference.reasoningEffort === undefined) delete agentOptions.reasoningEffort
  else agentOptions.reasoningEffort = preference.reasoningEffort
  ctx.logger.info(
    `dsh-better-subagent: "${providerName}" child route ${preference.provider}/${preference.model}`
    + `${preference.reasoningEffort === undefined ? '' : ` (${preference.reasoningEffort})`}`
  )
  return {
    ...request,
    agentOptions
  }
}

/**
 * Mount the delegation seam for as long as this plugin lives.
 * @param ctx - plugin context carrying the `subagents` service.
 * @param config - resolved plugin Config.
 */
function installDefaultRoute(ctx, config) {
  const subagents = ctx.subagents
  const originalStart = subagents.start
  const originalStartContinuable = subagents.startContinuable
  const wrappedStart = async function (providerName, request) {
    return originalStart.call(this, providerName, withDefaultRoute(ctx, config, providerName, request))
  }
  const wrappedStartContinuable = typeof originalStartContinuable !== 'function' ? undefined : async function (spec) {
    return originalStartContinuable.call(this, {
      ...spec,
      request: withDefaultRoute(ctx, config, spec.provider, spec.request)
    })
  }
  subagents.start = wrappedStart
  if (wrappedStartContinuable !== undefined) subagents.startContinuable = wrappedStartContinuable
  ctx.effect(() => () => {
    if (subagents.start === wrappedStart) subagents.start = originalStart
    if (wrappedStartContinuable !== undefined && subagents.startContinuable === wrappedStartContinuable) {
      subagents.startContinuable = originalStartContinuable
    }
  }, 'dsh-better-subagent: default child route')
}

/** Delegation tool names whose presence means an agent can start subagents. */
const DELEGATION_TOOLS = ['subagent', 'subagent_fork', 'subagent_codex', 'subagent_claude_code']
/** Default and maximum blocking budget for one wait, in milliseconds. */
const DEFAULT_WAIT_MS = 10 * 60_000
const MAX_WAIT_MS = 60 * 60_000
/** Internal observation cadence; the model never sees these polls. */
const POLL_MS = 750
/** Grace window for a just-started child to appear in the catalog. */
const APPEAR_GRACE_MS = 5_000

/** Text appended to every subagent-capable system prompt. */
const WAIT_GUIDANCE = 'Delegated subagents run in the background and the runtime notifies you when one stops: '
  + 'never start a sleep, watchdog, or polling job to wait for a subagent, and never repeat a status check to burn time. '
  + 'When your next step genuinely needs their result, call `wait_subagents` once and continue as soon as it returns; '
  + 'otherwise keep working on something else and let the settlement notice arrive.'

/** Clamp one requested budget into the accepted window. */
function waitBudget(requested) {
  if (typeof requested !== 'number' || !Number.isFinite(requested)) return DEFAULT_WAIT_MS
  return Math.min(Math.max(Math.trunc(requested), 1_000), MAX_WAIT_MS)
}

/** Whether a live agent is currently executing a turn. */
function isRunning(agents, id) {
  return agents.get(id)?.status === 'running'
}

/** Read the caller's direct-child catalog, tolerating an unavailable query. */
async function childRows(ctx, caller, signal) {
  try {
    return await ctx.subagents.listChildren(caller.id, signal)
  } catch (error) {
    if (signal?.aborted) throw error
    return []
  }
}

/** The child's closing assistant text, when its session is still resident. */
function closingText(agents, id) {
  const agent = agents.get(id)
  const session = agent?.session
  if (session === undefined) return undefined
  let events
  try {
    events = session.snapshotEvents()
  } catch {
    return undefined
  }
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'assistant/message') continue
    const blocks = event.data?.message?.content
    if (!Array.isArray(blocks)) continue
    const text = blocks
      .filter((block) => block?.type === 'text' && typeof block.text === 'string' && block.text.length > 0)
      .map((block) => block.text)
      .join('\n')
      .trim()
    if (text.length > 0) return text.length > 1200 ? `${text.slice(0, 1200)}…` : text
  }
  return undefined
}

/** Render one wait report for the model. */
function report(elapsedMs, rows, agents, settledNaturally) {
  const seconds = Math.round(elapsedMs / 1000)
  const running = rows.filter((row) => row.running)
  const head = running.length === 0
    ? `Every waited subagent stopped working (${seconds}s).`
    : `Waited ${seconds}s; ${running.length} of ${rows.length} subagent(s) are still working: ${running.map((row) => row.id).join(', ')}.`
  const lines = rows.map((row) => {
    const text = row.running ? undefined : closingText(agents, row.id)
    return `- ${row.id} — ${row.label ?? '(no label)'} [${row.mode ?? 'unknown'}] — ${row.running ? 'still working' : 'stopped'}`
      + (text === undefined ? '' : `\n  closing message: ${text}`)
  })
  const tail = settledNaturally
    ? '\nA finished background subagent also sends its own settlement notice; do not poll for it.'
    : '\nRe-list the children if you need their current state, then continue.'
  return `${head}\n${lines.join('\n')}${tail}`
}

/**
 * Block until the caller's named subagents (or every working one) stop working.
 * @param ctx - context carrying the subagent service and live Agent registry.
 * @param args - model-supplied `subagent_ids` and `timeout_ms`.
 * @param exec - the calling execution (agent and cancellation signal).
 * @returns the model-facing wait report.
 */
async function waitForSubagents(ctx, args, exec) {
  const agents = ctx.agents
  const caller = exec.agent
  if (caller === undefined) throw new Error('wait_subagents requires a calling agent')
  const requested = Array.isArray(args?.subagent_ids)
    ? [...new Set(args.subagent_ids.filter((id) => typeof id === 'string' && id.length > 0))]
    : undefined
  const budget = waitBudget(args?.timeout_ms)
  const started = Date.now()
  const deadline = started + budget
  const signal = exec.signal

  /** Resolve the ids this call owns, refreshing each row's live status. */
  const targetsOf = async () => {
    const rows = await childRows(ctx, caller, signal)
    if (requested !== undefined) {
      return requested.map((id) => {
        const row = rows.find((entry) => entry.id === id)
        return {
          id,
          label: row?.label,
          mode: row?.mode,
          running: isRunning(agents, id)
        }
      })
    }
    return rows
      .filter((row) => row.kind !== 'diagnostic' && isRunning(agents, row.id))
      .map((row) => ({ id: row.id, label: row.label, mode: row.mode, running: true }))
  }

  let rows = await targetsOf()
  // A child just started may not be published yet: give it one short grace
  // window before reporting that there is nothing to wait for.
  if (requested === undefined && rows.length === 0) {
    while (Date.now() < deadline && Date.now() - started < APPEAR_GRACE_MS) {
      await delay(Math.min(POLL_MS, Math.max(0, deadline - Date.now())), { signal })
      rows = await targetsOf()
      if (rows.length > 0) break
    }
  }
  if (rows.length === 0) {
    return requested === undefined
      ? 'No subagent is working right now: every direct child you started has already stopped. Do not start a sleep or polling job; a finished background subagent reports itself.'
      : `No such subagent under this session: ${requested.join(', ')}.`
  }

  for (;;) {
    if (!rows.some((row) => row.running)) return report(Date.now() - started, rows, agents, true)
    if (Date.now() >= deadline) return report(Date.now() - started, rows, agents, false)
    await delay(Math.min(POLL_MS, Math.max(0, deadline - Date.now())), { signal })
    rows = await targetsOf()
  }
}

/**
 * Register the `wait_subagents` tool and the anti-sleep prompt guidance.
 * @param ctx - context carrying `tools`, `systemPrompt`, and `agents`.
 * @param config - resolved plugin Config.
 */
function installWaitTool(ctx, config) {
  ctx.tools.register({
    name: 'wait_subagents',
    description: 'Block until subagents you started stop working, then report each one with its status and closing message. '
      + 'Use this instead of sleeping, polling, or repeatedly checking status: it returns the moment the work is done. '
      + 'Omit subagent_ids to wait for every direct child that is currently working; name ids to wait for exactly those.',
    // `tools.register()` takes an ALREADY-compiled JSON Schema, unlike
    // `defineTool()` which compiles the property-map DSL. A bare property map
    // here would project a null root type and every model request would be
    // rejected before dispatch, so the object root is written out by hand.
    parameters: {
      type: 'object',
      properties: {
        subagent_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Child session ids to wait for. Omit to wait for every direct child that is currently working.'
        },
        timeout_ms: {
          type: 'number',
          description: 'Give up after this many milliseconds (default 600000, maximum 3600000). '
            + 'A timeout reports what is still working instead of failing.'
        }
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{
        type: 'text',
        text: value
      }]
    },
    execute(args, exec) {
      return waitForSubagents(ctx, args, exec)
    }
  })
  ctx.systemPrompt.section({
    name: 'dsh-better-subagent:wait',
    order: ctx.systemPrompt.getSectionOrder('TOOL_SUBAGENT'),
    text: (context) => {
      if (readPreference(config).waitTool !== true) return ''
      const capable = DELEGATION_TOOLS.some((toolName) => ctx.tools.get(toolName, context.scope) !== undefined)
      return capable ? WAIT_GUIDANCE : ''
    }
  })
}

/**
 * Mount both halves for as long as this plugin lives.
 * @param ctx - plugin context carrying the `subagents` service.
 * @param config - resolved plugin Config.
 */
export function apply(ctx, config) {
  installDefaultRoute(ctx, config)
  ctx.inject(['tools', 'systemPrompt', 'agents'], (scope) => {
    installWaitTool(scope, config)
  })
}
