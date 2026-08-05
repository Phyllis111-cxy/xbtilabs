(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XBTIScoring = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DIMS = ['o', 'l', 'i', 'a', 'v', 's'];
  const MAX = { o: 15, l: 16, i: 15, a: 14, v: 17, s: 12 };
  const TAG = {
    infoControl: '信息控制',
    suspectMotive: '怀疑动机',
    backupPlan: '备用方案',
    keepExit: '保留退路',
    refuseSolo: '拒绝单独行动',
    refuseIllegal: '拒绝非法进入',
    exitEarly: '主动退出'
  };

  function emptyScores() {
    return { o: 0, l: 0, i: 0, a: 0, v: 0, s: 0 };
  }

  function applyOption(scores, tags, option) {
    for (const [k, n] of Object.entries(option.scores || {})) scores[k] += n;
    for (const t of option.tags || []) tags.push(t);
  }

  function pct(scores) {
    const out = {};
    for (const d of DIMS) out[d] = (scores[d] / MAX[d]) * 100;
    return out;
  }

  function countMain(answers, dim, questions) {
    let n = 0;
    answers.forEach((choice, qi) => {
      const opt = questions[qi].options[choice];
      const entries = Object.entries(opt.scores || {});
      if (!entries.length) return;
      entries.sort((a, b) => b[1] - a[1]);
      if (entries[0][0] === dim) n += 1;
    });
    return n;
  }

  function pickRegular(scores, answers, questions) {
    const p = pct(scores);
    let best = DIMS.slice().sort((a, b) => {
      if (p[b] !== p[a]) return p[b] - p[a];
      const mb = countMain(answers, b, questions);
      const ma = countMain(answers, a, questions);
      if (mb !== ma) return mb - ma;
      for (let i = answers.length - 1; i >= 0; i--) {
        const sc = questions[i].options[answers[i]].scores || {};
        const aHit = sc[a] != null;
        const bHit = sc[b] != null;
        if (aHit !== bHit) return bHit ? 1 : -1;
      }
      return 0;
    })[0];
    return best;
  }

  function countTags(tags, names) {
    return tags.filter((t) => names.includes(t)).length;
  }

  function pickHidden(scores, tags) {
    const committee =
      scores.s >= 9 &&
      scores.a <= 6 &&
      countTags(tags, [TAG.keepExit, TAG.refuseSolo, TAG.refuseIllegal, TAG.exitEarly]) >= 3;
    const villain =
      scores.l >= 9 &&
      scores.i >= 7 &&
      countTags(tags, [TAG.suspectMotive, TAG.infoControl, TAG.backupPlan]) >= 3 &&
      tags.includes(TAG.infoControl);
    if (committee) return 'committee';
    if (villain) return 'villain';
    return null;
  }

  function calculate(answers, questions) {
    const scores = emptyScores();
    const tags = [];
    answers.forEach((choice, qi) => {
      applyOption(scores, tags, questions[qi].options[choice]);
    });
    const hidden = pickHidden(scores, tags);
    const key = hidden || pickRegular(scores, answers, questions);
    return { scores, tags, pct: pct(scores), key, hidden: Boolean(hidden) };
  }

  return { DIMS, MAX, TAG, emptyScores, applyOption, pct, pickRegular, pickHidden, calculate };
});
