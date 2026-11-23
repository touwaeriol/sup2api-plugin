// Posts the registry check result (artifact of check.yml) on its pull request
// and sets or clears the needs-review label. Called by comment.yml.
//
// The artifact comes from a run of the PR's own code, so it is untrusted:
// the PR number is checked against the run's head commit through the API,
// and a PR that touches anything outside publishers/ and plugins/ (for
// instance check.yml itself) always needs a manual review.
const fs = require('fs');
const path = require('path');

const MARKER = '<!-- sub2api-registry-check -->';
const LABEL = 'needs-review';
const REGISTRY_PATH = /^(publishers|plugins)\//;
const MAX_SUMMARY = 60000;

function read(dir, name) {
  try {
    return fs.readFileSync(path.join(dir, name), 'utf8');
  } catch {
    return null;
  }
}

function parseResult(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function outsideFiles(github, repo, number) {
  const files = await github.paginate(github.rest.pulls.listFiles, { ...repo, pull_number: number, per_page: 100 });
  const names = files.flatMap((f) => [f.filename, f.previous_filename].filter(Boolean));
  return names.filter((n) => !REGISTRY_PATH.test(n));
}

function render({ run, result, summary, reasons }) {
  const passed = run.conclusion === 'success';
  const lines = [
    MARKER,
    `### 索引检查：${passed ? '通过' : '未通过'}`,
    '',
    `- 提交：\`${run.head_sha.slice(0, 12)}\`，[运行记录](${run.html_url})`,
    `- 需人工审核：${reasons.length ? '是' : '否'}`,
    ...reasons.map((r) => `  - ${r}`),
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

module.exports = async ({ github, context, core, dir }) => {
  const run = context.payload.workflow_run;
  const repo = context.repo;
  const number = Number((read(dir, 'pr-number') || '').trim());
  if (!Number.isSafeInteger(number) || number <= 0) {
    core.setFailed('the check artifact has no PR number; see the check run');
    return;
  }
  const { data: pr } = await github.rest.pulls.get({ ...repo, pull_number: number });
  if (pr.head.sha !== run.head_sha) {
    core.info(`PR #${number} moved on from ${run.head_sha}; its newer run reports`);
    return;
  }

  const result = parseResult(read(dir, 'result.json'));
  const reasons = [];
  if (result?.needs_manual_review === true) reasons.push('检查工具标记：新发布者、新插件、改动发布者或删除版本');
  if (!result) reasons.push('没有检查结果');
  const outside = await outsideFiles(github, repo, number);
  if (outside.length) reasons.push(`改动了 publishers/、plugins/ 以外的文件：${outside.slice(0, 10).map((n) => `\`${n}\``).join('、')}`);

  const body = render({ run, result, summary: read(dir, 'summary.md'), reasons });
  await upsertComment(github, repo, number, body);
  await setLabel(github, repo, number, reasons.length > 0);
};
