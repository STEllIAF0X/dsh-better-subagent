/**
 * Browser half of dsh-better-subagent.
 *
 * Contributes one section to the Plugins page's Subagent card (the "子智能体"
 * page that owns the delegation limits and the authorized model list) through
 * the page's `plugins.detail.section` slot, and edits this plugin's own Host
 * settings namespace with `ctx.configForms`. The prebuilt bundle format is the
 * one dsh-client-modules serves: a `window.__ModuleLoader__.load` registration
 * whose factory exports `apply`/`inject`.
 */
window.__ModuleLoader__.load({
  id: 'dsh-better-subagent',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')
    const { jsx, jsxs, Fragment } = require('react/jsx-runtime')

    /** Dictionary namespace owned by this plugin. */
    const NS = 'subagentDefaultModel'
    /** Host loader entry id: also this plugin's settings namespace. */
    const ENTRY_ID = 'dsh-better-subagent'
    /** The Plugins-page item whose detail page carries this section. */
    const PAGE_ITEM_ID = 'subagent'

    const css = [
      '.dsdm_section{min-width:0;padding:16px 0;display:flex;flex-direction:column;gap:10px;max-width:720px}',
      '.dsdm_heading{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600;line-height:1.5}',
      '.dsdm_toggleRow{color:var(--dsw-alias-label-primary);justify-content:space-between;align-items:flex-start;gap:16px;font-size:13px;line-height:1.5;display:flex}',
      '.dsdm_toggleLabel{flex:1;min-width:0}',
      '.dsdm_hint,.dsdm_notice{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}',
      '.dsdm_invalid,.dsdm_conflict,.dsdm_failed{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-error-primary)}',
      '.dsdm_savedNotice{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-success-primary)}',
      '.dsdm_selection{display:flex;flex-direction:column;gap:10px}',
      '.dsdm_models{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);gap:6px;min-width:0;max-height:280px;margin:0;padding:10px;display:grid;overflow:auto}',
      '.dsdm_models legend{color:var(--dsw-alias-label-secondary);padding:0 4px;font-size:12px}',
      '.dsdm_modelGroup{gap:6px;display:grid}',
      '.dsdm_modelGroup+.dsdm_modelGroup{border-top:.5px solid var(--dsw-alias-border-l2);margin-top:4px;padding-top:10px}',
      '.dsdm_providerName{color:var(--dsw-alias-label-tertiary);padding:0 6px;font-size:11px;font-weight:500}',
      '.dsdm_model{border-radius:var(--dsw-radius-md);cursor:pointer;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;min-width:0;padding:6px;display:grid}',
      '.dsdm_model:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsdm_modelName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.4;display:block}',
      '.dsdm_route{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.4;display:block;overflow-wrap:anywhere}',
      '.dsdm_unavailable{color:var(--dsw-alias-state-warn-primary);font-size:11px;white-space:nowrap}',
      '.dsdm_catalogError{color:var(--dsw-alias-state-error-primary);justify-content:space-between;align-items:center;gap:12px;font-size:12px;display:flex}',
      '.dsdm_catalogError button{color:var(--dsw-alias-brand-primary);cursor:pointer;background:0 0;border:0;padding:0;font:inherit}',
      '.dsdm_efforts{display:flex;flex-direction:column;gap:6px}',
      '.dsdm_effortsLabel{color:var(--dsw-alias-label-secondary);font-size:12px}',
      '.dsdm_pills{display:flex;flex-wrap:wrap;gap:6px}',
      '.dsdm_pill{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);border-radius:999px;background:0 0;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:12px;line-height:1.5;padding:3px 10px}',
      '.dsdm_pill:hover:not(:disabled){border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}',
      '.dsdm_pillActive{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground)}',
      '.dsdm_pillActive:hover:not(:disabled){color:var(--dsw-alias-label-primary-foreground)}',
      '.dsdm_check{color:var(--dsw-alias-label-secondary);align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;display:flex}',
      '.dsdm_switch{box-sizing:border-box;width:36px;height:20px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);cursor:pointer;flex:none;padding:0;position:relative}',
      '.dsdm_switch:disabled{opacity:.5;cursor:default}',
      '.dsdm_switchOn{background:var(--dsw-alias-brand-primary);border-color:transparent}',
      '.dsdm_thumb{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:var(--dsw-alias-switch-thumb,#fff);transition:transform .15s ease}',
      '.dsdm_switchOn .dsdm_thumb{transform:translateX(16px)}',
      '.dsdm_footer{align-items:center;gap:8px;display:flex;flex-wrap:wrap}',
      '.dsdm_primaryButton,.dsdm_secondaryButton{box-sizing:border-box;border-radius:var(--dsw-radius-md);height:32px;font:inherit;cursor:pointer;border:none;justify-content:center;align-items:center;gap:4px;padding:0 14px;font-size:13px;line-height:1.5;display:inline-flex}',
      '.dsdm_primaryButton{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.dsdm_primaryButton:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.dsdm_secondaryButton{border:.5px solid var(--dsw-alias-border-l2);background:0 0;color:var(--dsw-alias-label-primary)}',
      '.dsdm_primaryButton:disabled,.dsdm_secondaryButton:disabled{opacity:.5;cursor:default}',
      '.dsdm_badge{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-secondary);align-items:baseline;gap:5px;min-width:0;height:24px;padding:0 8px;font-size:12px;line-height:22px;display:inline-flex}',
      '.dsdm_badgeModel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}',
      '.dsdm_badgeEffort{color:var(--dsw-alias-label-caption,var(--dsw-alias-label-tertiary));text-overflow:ellipsis;white-space:nowrap;flex-shrink:1000;overflow:hidden}'
    ].join('')
    const tagId = 'dsh-better-subagent/SubagentDefaultModel.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-better-subagent'
      tag.dataset.pluginCss = tagId
      tag.textContent = css
      document.head.appendChild(tag)
    }

    const zh = {
      title: '默认子智能体模型',
      toggle: '未指定模型时，子智能体使用默认模型',
      on: '开启后，Agent 委派子智能体且没有指定提供方与模型时，子智能体使用下面选定的模型，而不是继承父 Agent 的模型。仅影响之后新建的子智能体。',
      off: '关闭后，子智能体在没有指定模型时继承父 Agent 的模型。',
      legend: '默认模型',
      loading: '正在加载模型…',
      loadFailed: '无法加载模型目录。',
      retry: '重试',
      partial: '部分模型提供方暂时无法加载。',
      empty: '当前没有模型提供方公布模型。',
      unavailable: '当前不可用',
      unavailableGroup: '已保存但当前不可用',
      effortLegend: '推理强度',
      effortAuto: '模型默认',
      fork: '对继承上下文的子智能体（fork）同样生效；关闭后 fork 子智能体仍沿用父 Agent 的模型。',
      save: '保存',
      saving: '保存中…',
      discard: '放弃修改',
      failed: '本部署没有接受这些值，已保留供你修改。',
      saved: '已保存。',
      conflict: '设置已在其他位置更新。请放弃修改后重试。',
      invalid: '保存前请选择一个默认模型。',
      readOnly: '本部署的设置为只读。',
      unavailableForm: '该插件当前未加载，暂时无法配置。',
      precedence: '优先级：Agent 在工具调用中显式指定的模型 > 工具自身配置的子模型 > 此默认值 > 继承父 Agent。',
      waitToggle: '禁止用 sleep / 轮询等待子智能体',
      waitHint: '开启后，给能委派子智能体的 Agent 追加一段系统提示：不要开 sleep、看门狗或轮询任务等子智能体，需要结果时直接调用 wait_subagents 阻塞等待。（该工具始终注册、随时可用。）',
      badgeTitle: '该子智能体实际使用的模型（子智能体会话为只读，不能在此切换）',
      badgeEffortAuto: '默认强度'
    }
    const en = {
      title: 'Default subagent model',
      toggle: 'Subagents use the default model when none is named',
      on: 'While on, a delegation that names no provider and model runs the child on the route selected below instead of inheriting the delegating agent\u2019s model. It affects subagents started from now on.',
      off: 'While off, a subagent with no named model inherits the delegating agent\u2019s route.',
      legend: 'Default model',
      loading: 'Loading models…',
      loadFailed: 'The model catalog could not be loaded.',
      retry: 'Retry',
      partial: 'Some model providers could not be loaded.',
      empty: 'No model provider advertises a model.',
      unavailable: 'Unavailable',
      unavailableGroup: 'Saved but currently unavailable',
      effortLegend: 'Reasoning effort',
      effortAuto: 'Model default',
      fork: 'Also apply to context-inheriting (fork) subagents; when off, fork children keep the delegating agent\u2019s route.',
      save: 'Save',
      saving: 'Saving…',
      discard: 'Discard',
      failed: 'This deployment did not accept these values; they are kept for editing.',
      saved: 'Saved.',
      conflict: 'These settings changed elsewhere. Discard your edits and try again.',
      invalid: 'Select a default model before saving.',
      readOnly: 'This deployment\u2019s settings are read-only.',
      unavailableForm: 'This plugin is not loaded, so it cannot be configured right now.',
      precedence: 'Precedence: a model named in the tool call > a tool\u2019s own configured child model > this default > the delegating agent\u2019s route.',
      waitToggle: 'Forbid sleeping or polling while waiting for subagents',
      waitHint: 'Appends guidance to every subagent-capable agent: never start a sleep, watchdog, or polling job to wait for a subagent — call wait_subagents and block on it instead. (The tool stays registered either way.)',
      badgeTitle: 'The model this subagent actually runs (a child session is read-only; it cannot be switched here)',
      badgeEffortAuto: 'default effort'
    }

    /** Minimal snapshot store; the slot hook props read it through React. */
    function createStore(initial) {
      let snapshot = initial
      const listeners = new Set()
      return {
        getSnapshot: () => snapshot,
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        set(next) {
          if (next === snapshot) return
          snapshot = next
          for (const listener of [...listeners]) listener()
        }
      }
    }

    /** Opaque identity for one exact route. */
    function routeKey(route) {
      return `${route.provider}\u0000${route.model}`
    }

    /** Compare a form value with a draft field by field. */
    function sameDraft(value, draft) {
      return value.enabled === draft.enabled
        && value.provider === draft.provider
        && value.model === draft.model
        && value.reasoningEffort === draft.reasoningEffort
        && value.includeForkChildren === draft.includeForkChildren
        && value.waitTool === draft.waitTool
    }

    /** Normalize one form value into the draft shape. */
    function draftOf(value) {
      const source = value ?? {}
      return {
        enabled: source.enabled === true,
        provider: typeof source.provider === 'string' ? source.provider : '',
        model: typeof source.model === 'string' ? source.model : '',
        reasoningEffort: typeof source.reasoningEffort === 'string' ? source.reasoningEffort : '',
        includeForkChildren: source.includeForkChildren !== false,
        waitTool: source.waitTool !== false
      }
    }

    /**
     * Bridge this plugin's settings form and the live model directory onto the
     * section's staged state. Mirrors the shipped settings cards: drafts are
     * staged locally, one revision-fenced `mutate` writes them, and a revision
     * that moved underneath a draft is reported as a conflict.
     */
    class DefaultModelController {
      constructor(ctx, form) {
        this.ctx = ctx
        this.form = form
        this.catalogGroups = []
        this.catalogFailures = []
        this.catalogStatus = 'idle'
        this.catalogPartial = false
        this.draft
        this.draftRevision
        this.saving = false
        this.failed = false
        this.saved = false
        this.conflicted = false
        this.disposed = false
        this.catalogGeneration = 0
        this.store = createStore(this.projection())
        this.unsubscribe = form.subscribe(() => {
          if (!this.saving && this.draft !== undefined) {
            const snapshot = this.form.getSnapshot()
            if (snapshot.revision !== this.draftRevision) {
              if (sameDraft(draftOf(snapshot.value), this.draft)) this.clearDraft()
              else this.conflicted = true
            }
          }
          this.publish()
        })
        this.loadCatalog()
      }

      dispose() {
        this.disposed = true
        this.catalogGeneration += 1
        this.unsubscribe()
      }

      current() {
        return draftOf(this.form.getSnapshot().value)
      }

      draftOf() {
        return this.draft ?? this.current()
      }

      beginDraft() {
        if (this.draft === undefined) {
          this.draft = this.current()
          this.draftRevision = this.form.getSnapshot().revision
        }
        return this.draft
      }

      clearDraft() {
        this.draft = undefined
        this.draftRevision = undefined
        this.failed = false
        this.conflicted = false
      }

      editable() {
        const snapshot = this.form.getSnapshot()
        return !this.disposed && snapshot.status === 'ready' && snapshot.writable === true && !this.saving
      }

      toggleEnabled() {
        if (!this.editable()) return
        const draft = this.beginDraft()
        draft.enabled = !draft.enabled
        this.failed = false
        this.publish()
      }

      selectModel(provider, model) {
        if (!this.editable()) return
        const draft = this.beginDraft()
        if (draft.provider !== provider || draft.model !== model) draft.reasoningEffort = ''
        draft.provider = provider
        draft.model = model
        this.failed = false
        this.publish()
      }

      selectEffort(effort) {
        if (!this.editable()) return
        this.beginDraft().reasoningEffort = effort
        this.failed = false
        this.publish()
      }

      setIncludeForkChildren(include) {
        if (!this.editable()) return
        this.beginDraft().includeForkChildren = include === true
        this.failed = false
        this.publish()
      }

      setWaitTool(waitTool) {
        if (!this.editable()) return
        this.beginDraft().waitTool = waitTool === true
        this.failed = false
        this.publish()
      }

      discard() {
        if (this.saving) return
        this.clearDraft()
        this.saved = false
        this.publish()
      }

      async save() {
        const snapshot = this.form.getSnapshot()
        const draft = this.draft
        if (draft === undefined || this.saving) return
        if (snapshot.status !== 'ready' || snapshot.writable !== true) return
        if (draft.enabled && (draft.provider === '' || draft.model === '')) return
        if (snapshot.revision !== this.draftRevision) {
          this.conflicted = true
          this.publish()
          return
        }
        this.saving = true
        this.failed = false
        this.saved = false
        this.conflicted = false
        this.publish()
        const accepted = await this.form.mutate([
          { op: 'set', path: ['enabled'], value: draft.enabled },
          { op: 'set', path: ['provider'], value: draft.provider },
          { op: 'set', path: ['model'], value: draft.model },
          { op: 'set', path: ['reasoningEffort'], value: draft.reasoningEffort },
          { op: 'set', path: ['includeForkChildren'], value: draft.includeForkChildren },
          { op: 'set', path: ['waitTool'], value: draft.waitTool }
        ], this.draftRevision)
        if (this.disposed) return
        this.saving = false
        const landed = accepted && sameDraft(this.current(), draft)
        this.failed = !landed
        this.saved = landed
        if (landed) this.clearDraft()
        this.publish()
      }

      async loadCatalog() {
        if (this.disposed || this.catalogStatus === 'loading') return
        const generation = this.catalogGeneration
        this.catalogStatus = 'loading'
        this.publish()
        const response = await this.ctx.remote.session.modelCatalog()
        if (this.disposed || generation !== this.catalogGeneration) return
        if (response.ok) {
          this.catalogGroups = response.value.groups
          this.catalogFailures = response.value.failures
          this.catalogPartial = response.value.failures.length > 0
          this.catalogStatus = 'ready'
        } else {
          this.catalogStatus = 'error'
        }
        this.publish()
      }

      refreshCatalog() {
        if (this.disposed) return
        this.catalogGeneration += 1
        this.catalogStatus = 'idle'
        this.catalogPartial = false
        this.loadCatalog()
      }

      resetConnection() {
        if (this.disposed) return
        this.clearDraft()
        this.saved = false
        this.saving = false
        this.catalogGroups = []
        this.catalogFailures = []
        this.refreshCatalog()
      }

      /** The selected route's advertised reasoning efforts, when the catalog has it. */
      effortsFor(route) {
        for (const group of this.catalogGroups) {
          if (group.id !== route.provider) continue
          for (const model of group.models) {
            if (model.id !== route.model) continue
            return model.reasoning?.efforts ?? []
          }
        }
        return []
      }

      /** Display name for one exact route, falling back to the raw model id. */
      describeModel(provider, model) {
        for (const group of this.catalogGroups) {
          if (group.id !== provider) continue
          for (const candidate of group.models) if (candidate.id === model) return candidate.name
        }
        return model
      }

      /**
       * Display name for the effort one session runs: the named effort, else the
       * selected model's own default, else undefined.
       */
      describeEffort(provider, model, effort) {
        for (const group of this.catalogGroups) {
          if (group.id !== provider) continue
          for (const candidate of group.models) {
            if (candidate.id !== model) continue
            const reasoning = candidate.reasoning
            const wanted = effort ?? reasoning?.defaultEffort
            if (wanted === undefined) return undefined
            return reasoning?.efforts?.find((level) => level.id === wanted)?.name ?? wanted
          }
        }
        return effort
      }

      /** Catalog rows plus a stored route the catalog no longer advertises. */
      entries() {
        const draft = this.draftOf()
        const selected = draft.provider === '' || draft.model === '' ? undefined : routeKey({ provider: draft.provider, model: draft.model })
        const groups = this.catalogGroups.map((group) => ({
          id: group.id,
          name: group.name,
          models: group.models.map((model) => ({
            provider: group.id,
            model: model.id,
            key: routeKey({ provider: group.id, model: model.id }),
            modelName: model.name,
            providerName: group.name,
            available: true,
            selected: selected === routeKey({ provider: group.id, model: model.id })
          }))
        }))
        if (selected === undefined) return { groups, unavailable: [] }
        const known = groups.some((group) => group.models.some((model) => model.key === selected))
        if (known) return { groups, unavailable: [] }
        return {
          groups,
          unavailable: [{
            provider: draft.provider,
            model: draft.model,
            key: selected,
            modelName: draft.model,
            providerName: draft.provider,
            available: false,
            selected: true
          }]
        }
      }

      projection() {
        const snapshot = this.form.getSnapshot()
        const current = draftOf(snapshot.value)
        const draft = this.draftOf()
        return {
          available: snapshot.status === 'ready',
          pending: snapshot.status === 'loading',
          writable: snapshot.writable === true,
          readOnly: snapshot.status === 'ready' && snapshot.writable !== true,
          dirty: !sameDraft(current, draft),
          invalid: draft.enabled && (draft.provider === '' || draft.model === ''),
          enabled: draft.enabled,
          draft,
          current,
          saving: this.saving,
          failed: this.failed,
          saved: this.saved,
          conflicted: this.conflicted,
          catalogStatus: this.catalogStatus,
          catalogPartial: this.catalogPartial,
          catalogFailures: this.catalogFailures,
          entries: this.entries(),
          efforts: this.effortsFor({ provider: draft.provider, model: draft.model })
        }
      }

      publish() {
        this.store.set(this.projection())
      }
    }

    /** The shared visual language's toggle, scaled to the 36x20 primitive. */
    function Switch(props) {
      const className = props.checked ? 'dsdm_switch dsdm_switchOn' : 'dsdm_switch'
      return jsx('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': props.checked === true,
        'aria-label': props.label,
        className,
        disabled: props.disabled === true,
        onClick: props.onChange
      }, jsx('span', { className: 'dsdm_thumb' }))
    }

    /** One selectable model row. */
    function ModelRow(props) {
      const { entry, disabled, onSelect } = props
      return jsxs('label', {
        className: 'dsdm_model',
        children: [
          jsx('input', {
            type: 'radio',
            name: 'dsdm-default-model',
            checked: entry.selected,
            disabled,
            onChange: () => {
              onSelect(entry.provider, entry.model)
            }
          }),
          jsxs('span', {
            children: [
              jsx('span', { className: 'dsdm_modelName', children: entry.modelName }),
              jsx('span', {
                className: 'dsdm_route',
                children: `${entry.providerName} · ${entry.provider}/${entry.model}`
              })
            ]
          }),
          entry.available ? null : jsx('span', { className: 'dsdm_unavailable', children: props.unavailableLabel })
        ]
      }, entry.key)
    }

    /**
     * The Subagent page's default-model section. Renders nothing on any other
     * detail page, so one contribution serves the whole Plugins page.
     */
    function DefaultModelSection(props) {
      const { t, subject } = props
      if (subject?.kind !== 'item' || subject.id !== PAGE_ITEM_ID) return null
      const state = props.useDefaultModel((snapshot) => snapshot)
      const headingId = React.useId()
      const disabled = !state.writable || state.saving
      const selectedEfforts = state.efforts
      const effortValue = state.draft.reasoningEffort
      return jsxs('section', {
        className: 'dsdm_section',
        'aria-labelledby': headingId,
        'data-plugin-default-model': 'section',
        children: [
          jsx('h3', { className: 'dsdm_heading', id: headingId, children: t('title') }),
          jsxs('div', {
            className: 'dsdm_toggleRow',
            children: [
              jsx('span', { className: 'dsdm_toggleLabel', children: t('toggle') }),
              jsx(Switch, {
                checked: state.enabled,
                disabled,
                label: t('toggle'),
                onChange: props.toggleEnabled
              })
            ]
          }),
          jsx('p', { className: 'dsdm_hint', children: t(state.enabled ? 'on' : 'off') }),
          state.available || state.pending ? null : jsx('p', { className: 'dsdm_notice', children: t('unavailableForm') }),
          state.readOnly ? jsx('p', { className: 'dsdm_notice', children: t('readOnly') }) : null,
          state.enabled ? jsxs('div', {
            className: 'dsdm_selection',
            children: [
              state.catalogStatus === 'loading' ? jsx('p', { className: 'dsdm_notice', role: 'status', children: t('loading') }) : null,
              state.catalogStatus === 'error' ? jsxs('div', {
                className: 'dsdm_catalogError',
                role: 'alert',
                children: [
                  jsx('span', { children: t('loadFailed') }),
                  jsx('button', { type: 'button', disabled: state.saving, onClick: props.retryCatalog, children: t('retry') })
                ]
              }) : null,
              state.catalogPartial ? jsx('p', { className: 'dsdm_notice', children: t('partial') }) : null,
              state.entries.groups.length > 0 || state.entries.unavailable.length > 0 ? jsxs('fieldset', {
                className: 'dsdm_models',
                children: [
                  jsx('legend', { children: t('legend') }),
                  state.entries.groups.map((group) => jsxs('div', {
                    className: 'dsdm_modelGroup',
                    children: [
                      jsx('div', { className: 'dsdm_providerName', children: group.name }),
                      group.models.map((entry) => jsx(ModelRow, {
                        entry,
                        disabled,
                        unavailableLabel: t('unavailable'),
                        onSelect: props.selectModel
                      }, entry.key))
                    ]
                  }, group.id)),
                  state.entries.unavailable.length > 0 ? jsxs('div', {
                    className: 'dsdm_modelGroup',
                    children: [
                      jsx('div', { className: 'dsdm_providerName', children: t('unavailableGroup') }),
                      state.entries.unavailable.map((entry) => jsx(ModelRow, {
                        entry,
                        disabled,
                        unavailableLabel: t('unavailable'),
                        onSelect: props.selectModel
                      }, entry.key))
                    ]
                  }) : null
                ]
              }) : state.catalogStatus === 'ready' ? jsx('p', { className: 'dsdm_notice', children: t('empty') }) : null,
              selectedEfforts.length > 0 ? jsxs('div', {
                className: 'dsdm_efforts',
                children: [
                  jsx('div', { className: 'dsdm_effortsLabel', children: t('effortLegend') }),
                  jsxs('div', {
                    className: 'dsdm_pills',
                    children: [
                      jsx('button', {
                        type: 'button',
                        className: effortValue === '' ? 'dsdm_pill dsdm_pillActive' : 'dsdm_pill',
                        disabled,
                        onClick: () => {
                          props.selectEffort('')
                        },
                        children: t('effortAuto')
                      }),
                      selectedEfforts.map((effort) => jsx('button', {
                        type: 'button',
                        className: effortValue === effort.id ? 'dsdm_pill dsdm_pillActive' : 'dsdm_pill',
                        disabled,
                        title: effort.description,
                        onClick: () => {
                          props.selectEffort(effort.id)
                        },
                        children: effort.name
                      }, effort.id))
                    ]
                  })
                ]
              }) : null,
              jsx('label', {
                className: 'dsdm_check',
                children: [
                  jsx('input', {
                    type: 'checkbox',
                    checked: state.draft.includeForkChildren,
                    disabled,
                    onChange: (event) => {
                      props.setIncludeForkChildren(event.target.checked)
                    }
                  }),
                  jsx('span', { children: t('fork') })
                ]
              }),
              jsxs('label', {
                className: 'dsdm_check',
                children: [
                  jsx('input', {
                    type: 'checkbox',
                    checked: state.draft.waitTool,
                    disabled,
                    onChange: (event) => {
                      props.setWaitTool(event.target.checked)
                    }
                  }),
                  jsxs('span', {
                    children: [
                      t('waitToggle'),
                      jsx('span', { className: 'dsdm_hint', children: ` ${t('waitHint')}` })
                    ]
                  })
                ]
              }),
              state.invalid ? jsx('p', { className: 'dsdm_invalid', children: t('invalid') }) : null
            ]
          }) : null,
          state.conflicted ? jsx('p', { className: 'dsdm_conflict', role: 'status', children: t('conflict') }) : null,
          state.failed ? jsx('p', { className: 'dsdm_failed', role: 'alert', children: t('failed') }) : null,
          state.saved && !state.dirty ? jsx('p', { className: 'dsdm_savedNotice', role: 'status', children: t('saved') }) : null,
          jsx('p', { className: 'dsdm_hint', children: t('precedence') }),
          jsxs('div', {
            className: 'dsdm_footer',
            children: [
              jsx('button', {
                type: 'button',
                className: 'dsdm_primaryButton',
                disabled,
                onClick: props.save,
                children: state.saving ? t('saving') : t('save')
              }),
              jsx('button', {
                type: 'button',
                className: 'dsdm_secondaryButton',
                disabled: state.saving || !state.dirty,
                onClick: props.discard,
                children: t('discard')
              })
            ]
          })
        ]
      })
    }

    /**
     * The model a subagent conversation actually runs, shown in that session's
     * header. A child session has no model selector (its composer is read-only),
     * so this badge is the only place its route becomes visible. Root sessions
     * already show the model in the composer, so this renders nothing for them.
     */
    function SubagentModelBadge(props) {
      const { t, sessionId, useSessions } = props
      const isChild = useSessions((state) => state.byId?.[sessionId]?.origin === 'subagent')
      const selection = useSessions((state) => state.projectionsBySession?.[sessionId]?.values?.modelSelection?.next ?? null)
      if (isChild !== true || selection === null || selection === undefined) return null
      const modelLabel = props.describeModel(selection.provider, selection.model)
      const effortLabel = props.describeEffort(selection.provider, selection.model, selection.reasoningEffort) ?? t('badgeEffortAuto')
      return jsx('span', {
        className: 'dsdm_badge',
        title: `${t('badgeTitle')}\n${selection.provider}/${selection.model} · ${effortLabel}`,
        children: jsxs(Fragment, {
          children: [
            jsx('span', { className: 'dsdm_badgeModel', children: modelLabel }),
            jsx('span', { className: 'dsdm_badgeEffort', children: effortLabel })
          ]
        })
      })
    }

    const inject = ['slots', 'locale', 'remote', 'remote.session', 'configForms']

    /**
     * Register the dictionary, watch the live catalog, and contribute the
     * section while the Host serves this plugin's settings namespace.
     * @param ctx - browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-better-subagent: dictionaries')
      const form = ctx.configForms.get(ENTRY_ID)
      const controller = new DefaultModelController(ctx, form)
      ctx.effect(() => () => {
        controller.dispose()
      }, 'dsh-better-subagent: settings controller')
      ctx.effect(() => ctx.remote.$on('llm/adapters-updated', () => {
        controller.refreshCatalog()
      }), 'dsh-better-subagent: adapter invalidations')
      ctx.effect(() => ctx.remote.$on('settings/document-updated', () => {
        controller.refreshCatalog()
      }), 'dsh-better-subagent: settings invalidations')
      ctx.effect(() => ctx.on('connection/reset', () => {
        controller.resetConnection()
      }), 'dsh-better-subagent: connection generation')
      ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
        name: 'plugins.detail.section',
        id: 'dsh-better-subagent',
        order: 40,
        locale: NS,
        inject: () => ({
          hooks: {
            defaultModel: controller.store
          },
          toggleEnabled: () => {
            controller.toggleEnabled()
          },
          selectModel: (provider, model) => {
            controller.selectModel(provider, model)
          },
          selectEffort: (effort) => {
            controller.selectEffort(effort)
          },
          setIncludeForkChildren: (include) => {
            controller.setIncludeForkChildren(include)
          },
          setWaitTool: (waitTool) => {
            controller.setWaitTool(waitTool)
          },
          retryCatalog: () => {
            controller.refreshCatalog()
          },
          save: () => {
            void controller.save()
          },
          discard: () => {
            controller.discard()
          }
        })
      }, DefaultModelSection))), 'dsh-better-subagent: subagent page section')
      ctx.effect(() => ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'dsh-better-subagent-model',
        order: 20,
        locale: NS,
        inject: () => ({
          describeModel: (provider, model) => controller.describeModel(provider, model),
          describeEffort: (provider, model, effort) => controller.describeEffort(provider, model, effort)
        })
      }, SubagentModelBadge)), 'dsh-better-subagent: subagent model badge')
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
