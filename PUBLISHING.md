# 发布与上架 checklist

本文档只是流程记录，不会被打进 npm 包（`files` 未包含它）。

## 0. 现状

- 包名：`dsh-better-subagent`（npm 上未被占用，已核实）
- 版本：`0.1.0`
- 作者 / 许可：`STEllIAF0X` / MIT
- 仓库：`https://github.com/stelliaf0x/dsh-better-subagent`（本地 git 已初始化并打好首个 commit，remote 已指向该地址）
- 开发基线：`@deepseek-ai/dsh@0.2.0-rc.2`，`dsh.engines.dsh = ">=0.2.0-rc.1"`
- 已做过：`pnpm pack` 产物装进空白 consumer 后能正常 `import`，依赖（`@deepseek-ai/schemastery`）自动解析 ✓

## 1. 发布到 npm

```powershell
cd C:\Users\16032\Documents\deepseek-harness\default-workspace\dsh-better-subagent
npm login                 # 浏览器/OTP 登录，写入 ~/.npmrc
npm whoami                # 确认身份
npm publish               # 发 0.1.0；包已在 package.json 里声明 publishConfig.access=public
npm view dsh-better-subagent version    # 回读校验
```

注意：`0.1.0` 一旦发布就不可覆盖、不可删除同名版本（只能 `npm deprecate` 或发新版本）。若想先干跑，
用 `npm publish --dry-run` 看一遍打包清单。

## 2. 推到 GitHub

```powershell
cd C:\Users\16032\Documents\deepseek-harness\default-workspace\dsh-better-subagent
git push -u origin main
```

（本机访问不了 github.com，需要代理或用浏览器网页端建仓后 `git push`。）

## 3. 提交到市场（精选列表）

`dshmarket` 只读精选列表 **[awesome-dsh-plugin](https://awesome-dsh-plugin.com/plugins.json)**，
数据源是 GitHub 仓库 `awesome-dsh-plugin/awesome-dsh-plugin`（该仓库是列表本身，不是市场应用）。
上架方式：**去那个仓库提 PR，在对应分类的列表里加一条**，站点与市场每天刷新生效。

条目字段（照 `plugins.json` 的既有格式）：

| 字段 | 值 |
|---|---|
| name | `dsh-better-subagent` |
| owner | `stelliaf0x` |
| url | `https://github.com/stelliaf0x/dsh-better-subagent` |
| category | `session`（也可放 `tools`；只是一个分类目录） |
| npm | `dsh-better-subagent` |
| install | `dsh plugin --profile web add dsh-better-subagent` |

description（en / zh，PR 里按仓库现有格式填）：

```json
{
  "en": "Better subagents for DeepSeek Harness: choose the default subagent model so a delegation that names no model stops inheriting the agent's own route, see each subagent conversation's model and reasoning effort in its header (a child session's composer is read-only, so the stock UI shows nothing), and wait for subagents with a blocking wait_subagents tool plus prompt guidance that forbids sleep/watchdog/polling jobs while waiting.",
  "zh": "给 DSH 的子智能体补三件事：①在「插件 → 子智能体」页选默认子模型——Agent 委派子智能体却没指定模型时不再继承父 Agent 的模型；②子智能体会话标题栏显示它实际使用的模型与推理强度（子会话 composer 只读，原版界面看不到任何模型信息）；③提供阻塞式 wait_subagents 工具，并提示 Agent 不要用 sleep / 轮询任务等待子智能体。"
}
```

可选：`screenshots`（GitHub 图床直链数组）。建议放两张：子智能体设置页的「默认子智能体模型」一节、
子智能体会话标题栏的模型徽标。

## 4. 发布后自检（市场路径）

```powershell
# 在一个干净 profile 上按市场的方式装（这是用户点「安装」时真正执行的命令）
dsh plugin --profile <新profile名> add dsh-better-subagent
```

或在本机临时 consumer 里验证：

```powershell
mkdir $env:TEMP\consumer; cd $env:TEMP\consumer
'{ "name": "consumer", "private": true, "type": "module" }' | Set-Content package.json
pnpm add dsh-better-subagent
node -e "import('dsh-better-subagent').then(m => console.log(Object.keys(m)))"
```
