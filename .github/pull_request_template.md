<!--
一个 PR 只改一个发布者名下的文件（publishers/<id>.json 或它的插件目录）。
版本文件请用 `sub2api-plugin registry add-version` 生成，不要手写。
说明见 CONTRIBUTING.md。
-->

## 改动类型

- [ ] 新增版本（已登记的插件；检查通过即可合并）
- [ ] 弃用版本或插件（只新增 `deprecated` 字段）
- [ ] 新发布者入驻（需人工审核）
- [ ] 新增插件（需人工审核）
- [ ] 修改发布者信息（需人工审核）
- [ ] 删除版本（下架，需人工审核）
- [ ] 其他（仓库文档、schema、workflow 等，需人工审核）

## 发布者与插件

- 发布者 id：
- 插件 key：
- 版本：
- Release 地址：

## 说明

<!-- 本版本的主要变化；新增权限、数据库迁移或出口域名时说明原因；弃用或下架请写明原因与替代版本。 -->

## 自查

- [ ] 我的 GitHub 账号在该发布者 `github` 列表里（新发布者除外）
- [ ] 包已作为附件发布在插件 `repo` 的 GitHub Release 上，且发布后不会再替换
- [ ] 改动了 `publishers/*.json` 时已运行 `sub2api-plugin registry codeowners --registry . > CODEOWNERS`
