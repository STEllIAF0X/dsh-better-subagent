# dsh-better-subagent

English | [中文](#中文)

**English** — three fixes for subagents in DeepSeek Harness (`dsh`):

1. **Default subagent model** — pick the route on the Plugins → Subagent settings page. When an agent delegates without naming a model, the child runs on that default instead of silently inheriting the delegating agent's model.
2. **Model badge on subagent conversations** — a child session's composer is read-only, so the stock UI never says which model it runs; this plugin shows the model (and reasoning effort) in that session's header.
3. **No more sleeping while waiting** — a blocking `wait_subagents` tool returns as soon as the subagents you started stop working, plus prompt guidance that forbids sleep/watchdog/polling jobs while waiting.

Install from the market, or:

```bash
dsh plugin --profile web add dsh-better-subagent
```

Developed and verified against `@deepseek-ai/dsh@0.2.0-rc.2`; MIT licensed.

---

<a id="中文"></a>
**中文** —— `dsh-better-subagent` 给 DSH 的子智能体补三件事：

1. **默认子智能体模型** —— 在「插件 → 官方 → 子智能体」页面选一个默认模型。Agent 委派子智能体却
   没有指定模型时，子智能体用它，而**不再继承父 Agent 的模型**。
2. **子智能体会话显示模型** —— 子智能体的对话界面（composer 是只读的，原本看不到任何模型信息）
   在标题栏右侧显示该会话实际使用的模型与推理强度。
3. **等待子智能体不再 sleep** —— 注册 `wait_subagents` 工具：阻塞到指定的（或全部正在运行的）子智能体
   停止工作再返回，并给能委派子智能体的 Agent 追加提示，禁止用 sleep / 轮询硬等。

## 一、默认子智能体模型

### 为什么需要它

DSH 自带的「子智能体」设置页只能规定 *Agent 可以给子智能体选哪些模型*（`subagent-model-selection`）。
当 Agent 没有显式选模型时，运行时会让子智能体继承父 Agent 当前的模型
（`resolveChildAgentOptions` 把请求里的 `agentOptions` 覆盖到父 Agent 的最新请求之上），
即使那个模型并不在勾选列表里。

优先级（高 → 低）：

1. Agent 在工具调用里显式给出的 `provider` / `model`
2. 某个委派工具实例自身配置的 `agentOptions`（例如 preset 里 `tool-subagent` 的配置）
3. **本插件配置的默认模型**（仅在开启时）
4. 父 Agent 的模型（运行时的继承行为）

覆盖 `spawn` 与 `fork` 两种 provider，前台 / 后台 / 可续（continuable）三种模式，以及 workflow 子智能体。
`includeForkChildren` 关闭时，继承上下文的 fork 子智能体保持父 Agent 的路由。

### 界面

侧边栏 **插件** → 官方 → **子智能体** → 页面底部的 **默认子智能体模型**：开关、默认模型单选、
推理强度、是否对 fork 生效、是否追加「禁止 sleep」提示，以及保存 / 放弃修改。
保存写入当前 profile `cordis.patch.yml` 里本插件那一行的 `config`；Host 端是 volatile 字段，改完立即生效。

## 二、子智能体会话显示模型

子智能体会话的输入框是只读的（没有模型选择器），所以原版界面上看不到它跑的是哪个模型。
本插件向 `conversation.session.header.utilities` 槽注册一个徽标：仅在该会话 `origin === 'subagent'`
时显示「模型名 + 推理强度」，悬停可看 `provider/model` 全名。数据来自会话自己的 `modelSelection`
投影（会话历史里那次请求的真实路由），模型显示名与推理强度名取自实时模型目录。
根会话不显示（它的 composer 里本来就有模型选择器）。

## 三、等待子智能体：`wait_subagents`

### 问题

DSH 的后台子智能体本来就会在结束时给出结算通知（continuable 走 settlement notice，one-shot 走后台任务），
`list_agents` 的说明里也写着「不需要反复查看状态」。但运行时**没有提供一个「阻塞等待」的原语**：
模型拿不到结果又不想结束回合时，就会自己开一个 `sleep` / 看门狗后台任务硬等 —— 既浪费一次工具调用与
一轮 token，也让「等待」退化成猜测时长的轮询。

### 本插件的做法

- 注册全局工具 **`wait_subagents`**：`subagent_ids` 省略 = 等待当前所有正在运行的直接子智能体；
  也可以点名等待。内部按 750ms 观察一次 `ctx.subagents.listChildren()` 与 Agent 注册表，
  直到目标都不再运行（或到达 `timeout_ms`，默认 10 分钟、上限 60 分钟）后返回一份报告：
  每个子智能体的 id、标签、模式、状态，以及（会话仍在内存中时）它的收尾消息。
  工具本身不声明 `timeoutMs`，所以不会被工具超时策略打断；用户点停止时按 `exec.signal` 立即退出。
- 追加一段全局系统提示（仅对**能看到 `subagent` / `subagent_fork` 等委派工具**的 Agent 生效）：
  不要开 sleep、看门狗或轮询任务等子智能体；确实需要结果时调用一次 `wait_subagents`。

于是模型有了正当的阻塞方式，`sleep 10min` 那套硬等就不再必要。设置页里的开关可以关掉这段提示
（工具本身始终注册）。

## 配置字段（Host 行）

```yaml
- insert:
    - id: dsh-better-subagent
      name: dsh-better-subagent
      config:
        enabled: true                       # 默认模型总开关
        provider: deepseek-account          # 默认子级 provider
        model: deepseek-flash               # 默认子级 model
        reasoningEffort: max                # 留空表示用所选模型自己的默认强度
        includeForkChildren: true           # 是否对 fork 子智能体同样生效
        waitTool: true                      # 是否追加「禁止 sleep / 轮询」提示
```

行 id 同时是本插件的设置命名空间（浏览器半边按它读写），所以 profile patch 里的 id 必须与包名一致。

## 安装

```powershell
pwsh -File .\install.ps1                 # 默认安装到 ~/.dsh/profiles/desktop
pwsh -File .\install.ps1 -Profile web    # 其它 profile
```

`install.ps1` 按 DSH 自己的 bundle 布局安装（与 GUI 的「添加插件」同构）：

1. 打包到 `<profile>\vendor\dsh-better-subagent-<version>.tgz`（没有 pnpm 时退回目录安装）；
2. 在 profile 的 `package.json` 里登记依赖 `file:./vendor/...`，并把包名加入 `dsh.profile.bundles`；
3. 把包复制到 `<profile>\node_modules\dsh-better-subagent`，让依赖立刻可解析；
4. 在 profile 的 `cordis.patch.yml` 里写一行 **id 覆盖**（不是 `insert`）——行本身由插件自带的
   `dsh.bundle.patch` 插入，profile 只覆盖它的 `config`。

只有这样它才会出现在「插件 → 已安装」里（该列表只列 profile 清单里声明的 bundle），从而可以在 GUI 里
开关、卸载；手工往 `node_modules` 丢包 + 手写 `insert` 行虽然能跑，但不会出现在那个列表里。

`install.ps1` 不运行 `pnpm install`：清单与 `pnpm-lock.yaml` 的收敛交给 GUI 的下一次安装/卸载操作
（vendor 里的包已经就位），或你自己执行 `dsh plugin install`。

装好后 Host 半边由 profile 的配置热重载接管，浏览器半边由 `dsh-client-modules` 作为 `/plugins` 下的
bundle 提供。**注意**：`node_modules` 不在 DSH 的文件监听范围内（HMR 忽略 `**/node_modules`），
所以升级本插件后需要重新运行一次 `install.ps1` 并重新载入应用；只有 `cordis.patch.yml` 的改动会热重载。

## 实现

| 文件 | 作用 |
|---|---|
| [`lib/host.js`](lib/host.js) | Host 半边：volatile 设置 schema、包装 `ctx.subagents.start()` / `startContinuable()` 补默认路由、注册 `wait_subagents` 工具与反 sleep 提示 |
| [`lib/client.js`](lib/client.js) | 浏览器半边：「子智能体」设置页的一节（`plugins.detail.section`）＋ 子智能体会话标题栏的模型徽标（`conversation.session.header.utilities`） |
| [`cordis.patch.yml`](cordis.patch.yml) | 作为 bundle 安装时的插入行（`dsh.bundle.patch`） |

Host 半边只在 provider 声明了 `agentOptions` 能力时才介入路由，因此不会把原本可用的委派变成能力错误；
请求里已经同时带有 `provider` 与 `model` 时一律不修改；插件卸载时会把被包装的两个方法还原。
