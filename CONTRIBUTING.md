# 参与贡献：入驻商店与发布插件

本文面向插件开发者：如何把插件登记到 Sub2API 插件商店、如何发布新版本、如何弃用或下架。仓库结构、频道和审核规则见 [README.md](README.md)。

**所有 PR 都提到 `develop` 分支**（测试频道，索引 `https://raw.githubusercontent.com/touwaeriol/sup2api-plugin/index-develop/index.json`）。合并后先在测试频道可见，维护者验证后把 `develop` 晋级到 `main`（正式频道，`index-main`），你不需要另提 PR。

## 准备工具

登记处的所有文件都用 `sub2api-plugin` 生成和校验。它在 [touwaeriol/sup2api](https://github.com/touwaeriol/sup2api) 的 `next/tools/sub2api-plugin`，依赖同一工作区的其他模块，需要从源码构建（Go 版本见 `next/go.work`）：

```sh
git clone --branch develop --depth 1 https://github.com/touwaeriol/sup2api.git
cd sup2api/next/tools/sub2api-plugin
go build -o ~/bin/sub2api-plugin .
```

常用命令（都以本仓库根目录为 `--registry`）：

```sh
sub2api-plugin registry add-version --registry . --plugin <publisher>/<key> [--tag <tag>]   # 生成版本文件
sub2api-plugin registry check --registry . --base <基线仓库目录> --author <你的 GitHub 账号>   # 本地预检
sub2api-plugin registry codeowners --registry . > CODEOWNERS                  # 更新 CODEOWNERS
sub2api-plugin index --registry . --out index.json                            # 试生成索引
```

插件本身的开发、打包（`build`、`pack`）见 sup2api 仓库的插件开发文档。

## 一、发布者入驻（需人工审核）

1. Fork 本仓库，从 `develop` 开分支，新建 `publishers/<id>.json`。`id` 就是你插件清单（`manifest.json`）里的 `publisher`，最多 27 个小写字母和数字，中间可以有单个 `_`（不能有 `-`、`__`，不以 `_` 结尾）；它和插件 key 合起来的插件 id `_<publisher>__<key>` 不能超过 30 字节：

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

新建 `plugins/<publisher>/<key>/plugin.json`，两级目录分别等于插件清单的 `publisher` 和 `key`（不同发布者可以用同一个 key）：

```json
{
  "key": "hello",
  "publisher": "acme",
  "name": { "zh": "你好", "en": "Hello" },
  "description": { "zh": "一句话说明插件做什么。", "en": "One sentence on what the plugin does." },
  "repo": "acme/sub2api-hello",
  "source": "https://github.com/acme/sub2api-hello"
}
```

- `repo`：发布插件包的 GitHub 仓库。商店只接受这个仓库 Release 上的包，改 `repo` 需要人工审核。
- 插件 id 是 `_<publisher>__<key>`（上例 `_acme__hello`），不能超过 30 字节，发布者 id 加 key 太长时缩短 key。
- 可选放一个 `plugins/<publisher>/<key>/icon.svg`。
- 同时按下一节登记第一个版本，并更新 `CODEOWNERS`。

## 三、发布新版本（检查通过即可合并）

1. 在插件仓库里提高 `manifest.json` 的 `version`，用 `sub2api-plugin pack` 打出 `.s2plugin`（包里的 `source.json` 记录源码摘要，登记时写进版本文件的 `source_digest`）。
2. 在插件仓库（即 `plugin.json` 的 `repo`）发一个 GitHub Release，把 `.s2plugin` 作为附件上传，Release 说明写清这一版的改动（商店里“更新说明”链接到这个页面）。tag 只能是 `v<版本>`、`<key>-v<版本>` 或 `plugin-<key>-v<版本>` 三种之一，版本必须与包里的 `manifest.json` 一致（例如 `v1.2.0`、`hello-v1.2.0`、`plugin-hello-v1.2.0`）。一个仓库放多个插件时请用带 key 的形式。**一个 Release 只放一个 `.s2plugin`**；发布后不要替换附件，否则 sha256 对不上，已登记的版本将无法安装。
3. 在本仓库的 fork 里生成版本文件：

   ```sh
   sub2api-plugin registry add-version --registry . --plugin acme/hello               # 读该仓库的最新 Release
   sub2api-plugin registry add-version --registry . --plugin acme/hello --tag v1.2.0  # 或指定 tag
   ```

   发布者 `sub2api` 的插件可以只写 key（`--plugin codex`）。**一个仓库发布多个插件时必须带 `--tag`**（例如第一方插件都在 `touwaeriol/sup2api`）：不带时工具取的是整个仓库的最新 Release，很可能是别的插件或核心的 Release。

   工具会下载附件、计算 sha256 和大小、读取包内清单，写出 `plugins/<publisher>/<key>/versions/<version>.json`。请勿手改这个文件。设置了 `GITHUB_TOKEN` 环境变量时工具会带上它，避免 GitHub API 限流。
4. 向 `develop` 提 PR（只包含这一个版本文件）。提交 PR 的账号必须在发布者的 `github` 列表里。`check` 会重新下载包并核对，并在 PR 评论里列出与上一版相比新增的宿主权限（标出高风险项）、用户权限、数据库迁移和出口域名。检查通过即可合并；合并后测试频道的索引随即更新（raw 地址有几分钟缓存），在核心的插件市场切到测试频道即可看到；维护者把 `develop` 晋级到 `main` 后出现在正式频道。

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

- PR 一律提到 `develop`。
- 一个 PR 只改一个发布者名下的文件（`publishers/<id>.json` 和它的插件目录 `plugins/<id>/`）。
- 已合并的版本文件只能新增 `deprecated`，不能改其他字段；要修正就发一个新版本。
- 改了 `publishers/*.json` 就同步更新 `CODEOWNERS`，否则检查失败。
- 权限按开启 PR 的账号判断；不要让他人往你的 PR 分支追加提交。
- 改动 `publishers/`、`plugins/` 以外的文件一律人工审核。
