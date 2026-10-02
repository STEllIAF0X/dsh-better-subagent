# install.ps1 — 把 dsh-better-subagent 作为 profile bundle 安装到某个 DSH profile。
#
#   pwsh -File .\install.ps1                        # 默认 profile: desktop
#   pwsh -File .\install.ps1 -Profile web           # 其它 profile
#   pwsh -File .\install.ps1 -Home D:\dsh-home      # 其它 DSH home
#   pwsh -File .\install.ps1 -Pnpm C:\path\pnpm.cjs # 指定 pnpm 入口（可选）
#
# 做的事（和 GUI 的「添加插件」同构，装完会出现在「插件 → 已安装」里，可开关、可卸载）：
#   1. 把包放进 <profile>\vendor\：有 pnpm 就打 tarball，没有就把目录整份复制过去
#   2. 在 profile 的 package.json 里登记依赖（file: 指向 vendor）+ 把包名加进 dsh.profile.bundles
#   3. 把包复制到 <profile>\node_modules\<name>，让依赖立刻可解析
#   4. 在 profile 的 cordis.patch.yml 里写一行 id 覆盖（不是 insert）：行本身由插件自带的
#      bundle patch 插入，这里只覆盖它的 config（默认模型等）
#
# 不做的事：不修改 DSH 安装目录；不运行 pnpm install —— 清单与 lockfile 的收敛交给 GUI 的下一次
# 安装/卸载操作，或你自己执行 `dsh plugin install`。

param(
  [string]$Profile = 'desktop',
  [string]$Home = (Join-Path $env:USERPROFILE '.dsh'),
  [string]$Pnpm
)

$ErrorActionPreference = 'Stop'

$source = $PSScriptRoot
$packageName = 'dsh-better-subagent'
$rowId = 'dsh-better-subagent'
$profileDir = Join-Path $Home "profiles\$Profile"
$manifestPath = Join-Path $profileDir 'package.json'
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$vendorDir = Join-Path $profileDir 'vendor'

if (-not (Test-Path $manifestPath)) { throw "找不到 profile 清单：$manifestPath" }
if (-not (Test-Path $patchPath)) { throw "找不到 profile patch：$patchPath" }

$utf8 = New-Object System.Text.UTF8Encoding($false)
$manifest = [System.IO.File]::ReadAllText($manifestPath, $utf8) | ConvertFrom-Json
$version = ([System.IO.File]::ReadAllText((Join-Path $source 'package.json'), $utf8) | ConvertFrom-Json).version

# --- 1. 放进 vendor/ ---------------------------------------------------------
New-Item -ItemType Directory -Path $vendorDir -Force | Out-Null
$tarball = Join-Path $vendorDir "$packageName-$version.tgz"
$vendorPackage = Join-Path $vendorDir $packageName
$spec = $null

$pnpmCommand = $Pnpm
if (-not $pnpmCommand) {
  $found = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($found) { $pnpmCommand = $found.Source }
}
if ($pnpmCommand) {
  Push-Location $source
  try { & $pnpmCommand pack --pack-destination $vendorDir | Out-Null } finally { Pop-Location }
  if (Test-Path $tarball) {
    $spec = "file:./vendor/$packageName-$version.tgz"
    Write-Host "已打包：$tarball"
  }
}
if (-not $spec) {
  New-Item -ItemType Directory -Path $vendorPackage -Force | Out-Null
  Copy-Item (Join-Path $source '*') -Destination $vendorPackage -Recurse -Force
  $spec = "file:./vendor/$packageName"
  Write-Host "未找到 pnpm，改为目录安装：$vendorPackage"
}

# --- 2. 登记依赖 + bundle ----------------------------------------------------
[System.IO.File]::Copy($manifestPath, "$manifestPath.bak", $true)
$manifest.dependencies | Add-Member -NotePropertyName $packageName -NotePropertyValue $spec -Force
$bundles = @($manifest.dsh.profile.bundles)
if ($bundles -notcontains $packageName) { $bundles += $packageName }
$manifest.dsh.profile.bundles = $bundles
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 8), $utf8)
Write-Host "已登记依赖 $packageName = $spec，并加入 dsh.profile.bundles"

# --- 3. 让 node_modules 立刻可解析 -------------------------------------------
$target = Join-Path $profileDir "node_modules\$packageName"
New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item (Join-Path $source '*') -Destination $target -Recurse -Force
Write-Host "已复制到 $target"

# --- 4. patch 里写 id 覆盖（不是 insert） ------------------------------------
$text = [System.IO.File]::ReadAllText($patchPath, $utf8)
$block = @"

# --- $packageName (本地插件，以 profile bundle 形式安装) ---
# 三件事：① 「插件 → 官方 → 子智能体」页面底部的「默认子智能体模型」一节；② 子智能体会话标题栏
# 显示该会话的模型；③ 提供 wait_subagents 工具，并提示 Agent 不要用 sleep / 轮询等待子智能体。
# 行本身由插件自带的 bundle patch 插入（见 profile package.json 的 dsh.profile.bundles），
# 这里只覆盖它的 config；设置同样写在这里（settings 表单自动维护）。
- id: $rowId
  name: $packageName
  config:
    enabled: false
    provider: ''
    model: ''
    reasoningEffort: ''
    includeForkChildren: true
    waitTool: true
"@
if ($text -match "(?m)^- id:\s*$([regex]::Escape($rowId))\s*$") {
  Write-Host "profile patch 中已存在 $rowId 的覆盖行，未改动。"
} else {
  if (-not $text.EndsWith("`n")) { $block = "`n" + $block }
  [System.IO.File]::AppendAllText($patchPath, $block, $utf8)
  Write-Host "已向 $patchPath 追加 $rowId 的 config 覆盖行。"
}

Write-Host ''
Write-Host '完成。重新载入一次 DSH 应用后，插件会出现在「插件 → 已安装」中，可开关、可卸载。'
Write-Host '首次打开「插件 → 官方 → 子智能体 → 默认子智能体模型」时开启开关并选择模型即可生效。'
