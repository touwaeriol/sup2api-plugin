# sup2api-plugin：Sub2API 插件商店索引

这是 Sub2API（sub2api-next）插件商店的**索引登记处**：仓库里只登记“有哪些发布者、哪些插件、每个版本的包在哪里、sha256 是多少”，不存放插件包本身。插件包一律放在开发者自己仓库的 GitHub Release 上。

## 频道

商店就是本仓库，**频道是它的分支**：每次推送到频道分支 `<branch>`，CI 用 `sub2api-plugin index` 把该分支的登记文件汇总成 `index.json`（v2），推到分支 `index-<branch>`。频道的索引地址是：

```
https://raw.githubusercontent.com/touwaeriol/sup2api-plugin/index-<branch>/index.json
```

| 频道 | 分支 | 索引地址 | 用途 |
|---|---|---|---|
| 正式 | `main` | `https://raw.githubusercontent.com/touwaeriol/sup2api-plugin/index-main/index.json` | Sub2API 核心的默认频道 |
| 测试 | `develop` | `https://raw.githubusercontent.com/touwaeriol/sup2api-plugin/index-develop/index.json` | 新版本先登记到这里；测试环境在控制台切到测试频道安装验证 |

（raw.githubusercontent.com 有几分钟的缓存，合并后稍等即可。）

- **登记版本**：向 `develop` 提 PR（见 [CONTRIBUTING.md](CONTRIBUTING.md)），检查通过、合并后几分钟出现在测试频道。
- **晋级**：在测试频道验证过后，维护者从本仓库的 `develop` 向 `main` 提 PR（不要从 fork 提）。检查以 `--promotion` 运行：其中每个改动都已在 `develop` 上单独检查过，所以不再查提交者、不限一个发布者、不重新下载包，只校验全部文件并要求已发布的版本文件不变（只能加 `deprecated`），新增的版本逐个列出、标为需人工审核。合并后进入正式频道。版本只登记到 `develop`：目标为 `main` 的其他 PR 检查直接失败。
- **加频道**：把分支名加进 `.github/workflows/publish.yml` 和 `check.yml` 的分支列表即可（分支名只用字母、数字、`.`、`_`、`-`，最长 64 个字符，不含 `..`）。

商店不使用任何签名密钥：可信来源就是本仓库（每次改动经 PR 审核）加上索引里审核过的 sha256。核心安装时按索引里的 sha256 校验下载到的包，信任级别取该插件发布者的 `trust`。

## 目录结构

```
publishers/<id>.json                                发布者（id = 文件名 = 插件清单的 publisher）
plugins/<publisher>/<key>/plugin.json               插件（publisher、key = 两级目录名 = 插件清单的 publisher、key）
plugins/<publisher>/<key>/icon.svg                  插件图标（可选）
plugins/<publisher>/<key>/versions/<version>.json   版本（由 sub2api-plugin registry add-version 生成）
schemas/*.schema.json                   上面三种文件的 JSON Schema（draft 2020-12）
CODEOWNERS                              由 sub2api-plugin registry codeowners 生成
.github/                                CI：PR 检查、结果评论、索引发布
```

各文件的字段见 `schemas/`，要点：

- **插件身份**是发布者加 key：两个发布者可以各有一个同名 key 的插件，按目录区分。发布者 id 最多 27 个小写字母和数字，中间可以有单个 `_`（不以 `_` 结尾）；发布者 `sub2api` 的插件 id 就是 key，其他发布者的插件 id 是 `_<publisher>__<key>`，不能超过 30 字节。命令行里写插件用 `<publisher>/<key>`，只写 key 指 `sub2api` 的插件。
- **发布者**：`id`、中英文 `name`、可选 `homepage`、`github`（允许为该发布者提交版本的 GitHub 账号：CI 检查与 CODEOWNERS 用它，也写进索引，控制台会显示）、`trust`（`official` / `verified` / `community`）、`status`（`active` / `revoked`；撤销后其插件在商店中被标记且不能安装）。
- **插件**：`key`、`publisher`、中英文 `name` 与 `description`、`repo`（`owner/name`，包只能来自这个仓库的 Release）、可选 `source`、`builtin`、`deprecated`。
- **版本**：`version`（语义化版本，不带 `+build` 后缀）、`url`（必须是 `https://github.com/<repo>/releases/download/<tag>/<文件>.s2plugin`）、`release_url`（同一 tag 的 Release 页面 `https://github.com/<repo>/releases/tag/<tag>`，商店里作为“更新说明”链接）、`sha256`、`size`、`host_compat`、可选 `source_digest`（包里 `source.json` 记录的源码摘要，`sub2api-plugin pack` 写入；sup2api 的 CI 用它发现“源码变了却没升版本”）、可选 `deprecated`。版本文件合并后不能再改，只能新增 `deprecated` 字段。

## 审核规则

每个目标为 `develop` 或 `main` 的 PR 都由 `check` 工作流运行 `sub2api-plugin registry check`（晋级 PR 加 `--promotion`，见上）：校验全部文件；对新增或改动的版本，下载 Release 上的包，核对 sha256、大小、`source_digest`，并解包核对清单里的 key、version、hostCompat、publisher；把与上一版相比的权限、数据库迁移、出口域名变化写进 PR 评论。一个 PR 只能改动一个发布者名下的文件（`publishers/<id>.json` 和 `plugins/<id>/`，发布者按路径判断）。

| 改动 | 审核方式 |
|---|---|
| 已登记插件新增版本（提交者在发布者的 `github` 列表里） | 自动检查通过即可合并 |
| 给已有版本加 `deprecated` | 自动检查通过即可合并 |
| 新发布者入驻 | 人工审核 |
| 新增插件 | 人工审核 |
| 修改 `plugin.json`（含整体弃用、改 `repo`） | 人工审核 |
| 修改发布者文件（含 `github` 列表、`trust`、`status`） | 人工审核 |
| 删除版本（下架） | 人工审核 |
| 改动 `publishers/`、`plugins/` 以外的文件 | 人工审核 |

需要人工审核的 PR 会被打上 `needs-review` 标签，评论里写明原因。检查只是把关，最终合并仍由维护者操作；新增版本的 PR 检查通过后维护者无需逐行审阅即可合并。

权限判断用的 `--author` 是**开启 PR 的账号**。如果 PR 里有别人追加的提交（例如有权推送到该分支的其他人），检查不会区分，维护者合并前请留意提交记录。

## 开发者入驻与发布

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## CI 工作流

| 工作流 | 触发 | 作用 |
|---|---|---|
| `check.yml` | `pull_request_target`（目标分支 `develop`、`main`；opened、synchronize、reopened、edited） | job `registry-check`：目标为 `main` 而不是本仓库 `develop` 晋级的 PR 直接失败；运行 `registry check`、核对 `CODEOWNERS`、试生成索引；把摘要发成 PR 评论（同一条评论持续更新），按结果打或去掉 `needs-review` 标签；检查不通过则 job 失败 |
| `publish.yml` | push 到频道分支（`develop`、`main`）、手动触发（发布所在分支，不接受 tag） | 生成该分支的 `index.json` 并推到 `index-<branch>`；内容（除 `generated_at` 外）没变化就不推 |

`check.yml` 用 `pull_request_target`，这样来自 fork 的 PR 也能收到评论和标签。它的安全前提是**绝不执行 PR 里的任何代码**：工作流文件、`setup-tool` action 和评论脚本都来自 PR 的目标分支（`develop` 或 `main`）；PR 只作为数据检出（`head/` 是 PR 与目标分支合并后的树 `refs/pull/<n>/merge`，`base/` 是 PR 的基线提交），含符号链接的 PR 直接拒绝。修改 `.github/` 下的文件时务必保持这一点。PR 改动 `.github/` 等目录不会影响本次检查本身（检查用的是目标分支上的版本），工具也会把这类改动标为需人工审核。

工具 `sub2api-plugin` 由 `.github/actions/setup-tool` 从 [touwaeriol/sup2api](https://github.com/touwaeriol/sup2api) 的 `next/tools/sub2api-plugin` 现场构建，版本由该 action 的 `ref` 输入决定（应固定为一个提交 SHA，升级工具时改这里）。所有第三方 action 都固定到提交 SHA。

## 仓库设置（需维护者在 GitHub 上手动开启）

以下设置无法写在仓库文件里，需要维护者在 GitHub 网页上开启：

1. **`develop`、`main` 分支保护**（Settings → Rules → Rulesets，新建针对 `develop` 和 `main` 的规则集）：
   - 必须通过 Pull Request 合并（Require a pull request before merging）；
   - 要求状态检查通过（Require status checks to pass），必需检查选 `check.yml` 的 job `registry-check`（先让它在一个 PR 上跑过一次，才能在列表里选到）；
   - 禁止强推、禁止删除分支。
   - 只有维护者能推送 `develop`：晋级检查（`--promotion`）只认来自本仓库 `develop` 分支的 PR，靠的就是这一点。
   - 不建议开启“必须由 Code Owners 审核”：插件目录的 code owner 就是发布者本人，而 GitHub 不允许作者批准自己的 PR，开启后新增版本的 PR 无法合并。`CODEOWNERS` 的作用是自动请发布者关注涉及其插件的 PR。
2. **`index-*` 分支只允许 Actions 写**（新建针对 `index-*` 的规则集）：
   - 禁止强推、禁止删除分支；
   - 开启“限制更新”（Restrict updates），并在绕过列表（Bypass list）中加入 GitHub Actions。若账号类型不支持把 GitHub Actions 加入绕过列表，至少保留“禁止强推、禁止删除”，并确保只有维护者对仓库有写权限。
3. **默认分支设为 `develop`**（Settings → General → Default branch）：fork 和新 PR 默认就指向测试频道。
4. **Actions 设置**（Settings → Actions → General）：
   - Workflow permissions 选“Read repository contents permission”（各工作流已自行声明所需权限）；
   - 注意 `pull_request_target` 工作流不受“fork PR 需批准才运行”的设置约束，会自动运行，这正是它只读 PR 数据、不执行 PR 代码的原因。
5. **标签**：`needs-review` 标签会在第一次使用时自动创建，可在 Issues → Labels 里调整颜色和说明。
