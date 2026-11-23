// Posts the result of `sub2api-plugin registry check` (out/result.json and
// out/summary.md) on the pull request, keeping one comment up to date, and
// sets or clears the needs-review label. Called by check.yml from the base
// branch; result and summary are data produced from the PR's files.
const fs = require('fs');
const path = require('path');

const MARKER = '<!-- sub2api-registry-check -->';
const LABEL = 'needs-review';
const MAX_SUMMARY = 60000;

function read(dir, name) {
  try {
    return fs.readFileSync(path.join(dir, name), 'utf8');
  } catch {
    return null;
  }
}

function parse(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

function render({ result, summary, sha, runUrl }) {
  const extra = [
    ['CODEOWNERS 与生成结果一致', process.env.CODEOWNERS_OUTCOME],
    ['索引可以生成', process.env.INDEX_OUTCOME],
  ].filter(([, outcome]) => outcome && outcome !== 'success');
  const passed = result?.ok === true && extra.length === 0;
  const lines = [
    MARKER,
    `### 索引检查：${passed ? '通过' : '未通过'}`,
    '',
    `- PR 提交：\`${sha.slice(0, 12)}\`（检查的是它与 main 合并后的树），[运行记录](${runUrl})`,
    `- 需人工审核：${result?.needs_manual_review === false ? '否' : '是'}`,
    ...extra.map(([what, outcome]) => `- ${what}：未通过（${outcome}）`),
    '',
  ];
  if (!result) lines.push('> 没有拿到检查结果（result.json），请看运行记录。', '');
  if (summary) {
    const cut = summary.length > MAX_SUMMARY;
    lines.push('---', '', cut ? summary.slice(0, MAX_SUMMARY) : summary);
    if (cut) lines.push('', '> 摘要过长已截断，完整内容见运行记录的 Summary。');
  }
  return lines.join('\n');
}

async function upsertComment(github, repo, number, body) {
  const comments = await github.paginate(github.rest.issues.listComments, { ...repo, issue_number: number, per_page: 100 });
  const mine = comments.find((c) => c.user?.type === 'Bot' && c.body?.startsWith(MARKER));
  if (mine) {
    await github.rest.issues.updateComment({ ...repo, comment_id: mine.id, body });
  } else {
    await github.rest.issues.createComment({ ...repo, issue_number: number, body });
  }
}

async function setLabel(github, repo, number, on) {
  if (on) {
    await github.rest.issues.addLabels({ ...repo, issue_number: number, labels: [LABEL] });
    return;
  }
  try {
    await github.rest.issues.removeLabel({ ...repo, issue_number: number, name: LABEL });
  } catch (e) {
    if (e.status !== 404) throw e;
  }
}

module.exports = async ({ github, context, dir }) => {
  const pr = context.payload.pull_request;
  const repo = context.repo;
  const runUrl = `${context.serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${context.runId}`;
  const result = parse(read(dir, 'result.json'));
  const body = render({ result, summary: read(dir, 'summary.md'), sha: pr.head.sha, runUrl });
  await upsertComment(github, repo, pr.number, body);
  // Without a result the PR cannot be trusted to need no review.
  await setLabel(github, repo, pr.number, result?.needs_manual_review !== false);
};
