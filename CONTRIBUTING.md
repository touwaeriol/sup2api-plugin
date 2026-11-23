# 参与贡献：入驻商店与发布插件

本文面向插件开发者：如何把插件登记到 Sub2API 插件商店、如何发布新版本、如何弃用或下架。仓库结构和审核规则见 [README.md](README.md)。

## 准备工具

登记处的所有文件都用 `sub2api-plugin` 生成和校验。它在 [touwaeriol/sup2api](https://github.com/touwaeriol/sup2api) 的 `next/tools/sub2api-plugin`，依赖同一工作区的其他模块，需要从源码构建（Go 版本见 `next/go.work`）：

```sh
git clone --branch develop --depth 1 https://github.com/touwaeriol/sup2api.git
cd sup2api/next/tools/sub2api-plugin
go build -o ~/bin/sub2api-plugin .
```

常用命令（都以本仓库根目录为 `--registry`）：

```sh
sub2api-plugin registry add-version --registry . --plugin <key> [--tag <tag>]   # 生成版本文件
sub2api-plugin registry check --registry . --base <基线仓库目录> --author <你的 GitHub 账号>   # 本地预检
sub2api-plugin registry codeowners --registry . > CODEOWNERS                  # 更新 CODEOWNERS
sub2api-plugin index --registry . --out index.json                            # 试生成索引
```

插件本身的开发、打包（`build`、`pack`）见 sup2api 仓库的插件开发文档。

## 一、发布者入驻（需人工审核）

1. Fork 本仓库，新建 `publishers/<id>.json`。`id` 就是你插件清单（`manifest.json`）里的 `publisher`，只用小写字母、数字、`-`、`_`：

   ```json
   {
     "id": "acme",
     "name": { "zh": "Acme 工作室", "en": "Acme Studio" },
     "homepage": "https://github.com/acme",
     "github": ["acme-dev"],
     "trust": "community",
     "status": "active"
   }
   ```

   - `github`：允许为你提交版本的 GitHub 账号。以后只有这些账号提交的新增版本 PR 才能走自动检查。
   - `trust`：新发布者填 `community`；`verified`、`official` 由维护者审核后调整。
2. 运行 `sub2api-plugin registry codeowners --registry . > CODEOWNERS`，把更新后的 `CODEOWNERS` 一起提交。
3. 提 PR。可以和第一个插件（见下一节）放在同一个 PR 里。

## 二、登记新插件（需人工审核）

新建 `plugins/<key>/plugin.json`，`key` 等于插件清单的 `key`：

```json
{
  "key": "acme_hello",
  "publisher": "acme",
  "name": { "zh": "你好", "en": "Hello" },
  "description": { "zh": "一句话说明插件做什么。", "en": "One sentence on what the plugin does." },
  "repo": "acme/sub2api-hello",
  "source": "https://github.com/acme/sub2api-hello"
}
```

- `repo`：发布插件包的 GitHub 仓库。商店只接受这个仓库 Release 上的包，改 `repo` 需要人工审核。
- 可选放一个 `plugins/<key>/icon.svg`。
- 同时按下一节登记第一个版本，并更新 `CODEOWNERS`。

## 三、发布新版本（检查通过即可合并）

1. 在插件仓库里提高 `manifest.json` 的 `version`，用 `sub2api-plugin pack` 打出 `.s2plugin`。
2. 在插件仓库（即 `plugin.json` 的 `repo`）发一个 GitHub Release，把 `.s2plugin` 作为附件上传，Release 说明写清这一版的改动（商店里“更新说明”链接到这个页面）。tag 用 `v<版本>` 或 `<key>-v<版本>`，必须与包里的版本一致。**一个 Release 只放一个 `.s2plugin`**；发布后不要替换附件，否则 sha256 对不上，已登记的版本将无法安装。
3. 在本仓库的 fork 里生成版本文件：

   ```sh
   sub2api-plugin registry add-version --registry . --plugin <key>             # 读该仓库的最新 Release
   sub2api-plugin registry add-version --registry . --plugin <key> --tag v1.2.0  # 或指定 tag
   ```

   工具会下载附件、计算 sha256 和大小、读取包内清单，写出 `plugins/<key>/versions/<version>.json`。请勿手改这个文件。设置了 `GITHUB_TOKEN` 环境变量时工具会带上它，避免 GitHub API 限流。
4. 提 PR（只包含这一个版本文件）。提交 PR 的账号必须在发布者的 `github` 列表里。`check` 会重新下载包并核对，并在 PR 评论里列出与上一版相比新增的宿主权限（标出高风险项）、用户权限、数据库迁移和出口域名。检查通过即可合并；合并后索引随即更新（raw 地址有几分钟缓存），核心刷新市场后即可看到。

## 四、弃用与下架

**弃用（仍可安装）**：在版本文件里加 `deprecated` 字段，其他字段保持不变：

```json
"deprecated": {
  "reason": { "zh": "存在数据丢失问题，请升级到 1.2.1。", "en": "Loses data; upgrade to 1.2.1." }
}
```

弃用的版本仍可安装，但不算“最新版本”，也不会触发“有更新”提示，商店里会标出弃用并提示升级。检查通过即可合并。

要弃用整个插件，在 `plugin.json` 里加同样格式的 `deprecated`（修改 `plugin.json` 需人工审核）。

**下架（从商店消失）**：删除对应的 `versions/<version>.json`。删除版本需人工审核，请在 PR 里写明原因。合并后商店不再列出该版本，也不能再从商店安装它。

## PR 规则小结

- 一个 PR 只改一个发布者名下的文件（`publishers/<id>.json` 和它的插件目录）。
- 已合并的版本文件只能新增 `deprecated`，不能改其他字段；要修正就发一个新版本。
- 改了 `publishers/*.json` 就同步更新 `CODEOWNERS`，否则检查失败。
- 改动 `publishers/`、`plugins/` 以外的文件一律人工审核。
