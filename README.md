# sup2api-plugin：Sub2API 插件商店索引

这是 Sub2API（sub2api-next）插件商店的**索引登记处**：仓库里只登记“有哪些发布者、哪些插件、每个版本的包在哪里、sha256 是多少”，不存放插件包本身。插件包一律放在开发者自己仓库的 GitHub Release 上。

每次合并到 `main`，CI 用 `sub2api-plugin index` 把登记文件汇总成 `index.json`（v2），推到 `index` 分支。Sub2API 核心的市场源默认读取：

```
https://raw.githubusercontent.com/touwaeriol/sup2api-plugin/index/index.json
```

（raw.githubusercontent.com 有几分钟的缓存，合并后稍等即可。）

商店不使用任何签名密钥：可信来源就是本仓库（每次改动经 PR 审核）加上索引里审核过的 sha256。核心安装时按索引里的 sha256 校验下载到的包，信任级别取该插件发布者的 `trust`。

## 目录结构

```
publishers/<id>.json                    发布者（id = 文件名 = 插件清单的 publisher）
plugins/<key>/plugin.json               插件（key = 目录名 = 插件清单的 key）
plugins/<key>/icon.svg                  插件图标（可选）
plugins/<key>/versions/<version>.json   版本（由 sub2api-plugin registry add-version 生成）
schemas/*.schema.json                   上面三种文件的 JSON Schema（draft 2020-12）
CODEOWNERS                              由 sub2api-plugin registry codeowners 生成
.github/                                CI：PR 检查、结果评论、索引发布
```

各文件的字段见 `schemas/`，要点：

- **发布者**：`id`、中英文 `name`、可选 `homepage`、`github`（允许为该发布者提交版本的 GitHub 账号，只给 CI 用，不进索引）、`trust`（`official` / `verified` / `community`）、`status`（`active` / `revoked`；撤销后其插件在商店中被标记且不能安装）。
- **插件**：`key`、`publisher`、中英文 `name` 与 `description`、`repo`（`owner/name`，包只能来自这个仓库的 Release）、可选 `source`、`builtin`、`deprecated`。
- **版本**：`version`、`url`（必须是 `https://github.com/<repo>/releases/download/<tag>/<文件>.s2plugin`）、`sha256`、`size`、`host_compat`、可选 `deprecated`。版本文件合并后不能再改，只能新增 `deprecated` 字段。

## 审核规则

每个 PR 都由 `check` 工作流运行 `sub2api-plugin registry check`：校验全部文件；对新增或改动的版本，下载 Release 上的包，核对 sha256、大小，并解包核对清单里的 key、version、hostCompat、publisher；把与上一版相比的权限、数据库迁移、出口域名变化写进 PR 评论。一个 PR 只能改动一个发布者名下的文件。

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

## 开发者入驻与发布

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## CI 工作流

| 工作流 | 触发 | 作用 |
|---|---|---|
| `check.yml` | `pull_request` | 用只读令牌、不读任何 secret，在 PR 代码上运行 `registry check`、核对 `CODEOWNERS`、试生成索引，结果作为 artifact 上传 |
| `comment.yml` | `check` 完成（`workflow_run`） | 从默认分支运行，不执行 PR 代码；把检查摘要发成 PR 评论（同一条评论持续更新），按需打或去掉 `needs-review` 标签。这样来自 fork 的 PR 也能收到评论 |
| `publish.yml` | push 到 `main`、手动触发 | 生成 `index.json` 并推到 `index` 分支；内容（除 `generated_at` 外）没变化就不推 |

工具 `sub2api-plugin` 由 `.github/actions/setup-tool` 从 [touwaeriol/sup2api](https://github.com/touwaeriol/sup2api) 的 `develop` 分支（`next/tools/sub2api-plugin`）现场构建。

## 仓库设置（需维护者在 GitHub 上手动开启）

以下设置无法写在仓库文件里，需要维护者在 GitHub 网页上开启：

1. **`main` 分支保护**（Settings → Rules → Rulesets，新建针对 `main` 的规则集）：
   - 必须通过 Pull Request 合并（Require a pull request before merging）；
   - 要求状态检查通过（Require status checks to pass），必需检查选 `registry-check`；
   - 禁止强推、禁止删除分支。
   - 不建议开启“必须由 Code Owners 审核”：插件目录的 code owner 就是发布者本人，而 GitHub 不允许作者批准自己的 PR，开启后新增版本的 PR 无法合并。`CODEOWNERS` 的作用是自动请发布者关注涉及其插件的 PR。
2. **`index` 分支只允许 Actions 写**（新建针对 `index` 的规则集）：
   - 禁止强推、禁止删除分支；
   - 开启“限制更新”（Restrict updates），并在绕过列表（Bypass list）中加入 GitHub Actions。若账号类型不支持把 GitHub Actions 加入绕过列表，至少保留“禁止强推、禁止删除”，并确保只有维护者对仓库有写权限。
3. **Actions 设置**（Settings → Actions → General）：
   - 来自 fork 的 PR 工作流保持“首次贡献者需批准”（或更严格）；
   - Workflow permissions 选“Read repository contents permission”（各工作流已自行声明所需权限）。
4. **标签**：`needs-review` 标签会在第一次使用时自动创建，可在 Issues → Labels 里调整颜色和说明。
