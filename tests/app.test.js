// Loads index.html in jsdom and checks the real algorithm code against hand-calculated results.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), { JSDOM } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const load = () => new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true }).window;
const W = load(), plain = x => JSON.parse(JSON.stringify(x));
const procs = (...a) => a.map(([id, at, bt, pr]) => ({ id, at, bt, pr: pr ?? null }));
const EX = procs(['P1', 0, 5, 2], ['P2', 1, 3, 1], ['P3', 2, 1, 3]);   // example from the project brief
const cpu = (al, ps = EX, q = 2) => plain(al === 'RR' ? W.simRr(ps, q) : W.simCpu(ps, al));
const col = (r, k) => r.rows.map(x => x[k]);

test('CPU: hand-calculated completion/waiting/response times', () => {
  const want = { FCFS: [[5, 8, 9], [0, 4, 6], [0, 4, 6]], SJF: [[5, 9, 6], [0, 5, 3], [0, 5, 3]], SRTF: [[9, 5, 3], [4, 1, 0], [0, 0, 0]],
    RR: [[9, 8, 5], [4, 4, 2], [0, 1, 2]], PrioNP: [[5, 8, 9], [0, 4, 6], [0, 4, 6]], PrioP: [[8, 4, 9], [3, 0, 6], [0, 0, 6]] };
  for (const [al, [ct, wt, rt]] of Object.entries(want)) { const r = cpu(al); assert.deepEqual(col(r, 'ct'), ct, al + ' CT'); assert.deepEqual(col(r, 'wt'), wt, al + ' WT'); assert.deepEqual(col(r, 'rt'), rt, al + ' RT'); }
});
test('CPU: invariants hold for every algorithm', () => {
  for (const al of ['FCFS', 'SJF', 'SRTF', 'RR', 'PrioNP', 'PrioP']) {
    const r = cpu(al), used = {}; let t = 0;
    for (const g of r.segs) { assert.equal(g.s, t, al + ' timeline has a gap or overlap'); assert.ok(g.e > g.s); t = g.e; if (g.i >= 0) { assert.ok(g.s >= EX[g.i].at, al + ' ran before arrival'); used[g.i] = (used[g.i] || 0) + g.e - g.s; } }
    EX.forEach((p, k) => assert.equal(used[k], p.bt, al + ' burst of ' + p.id));
    r.rows.forEach(x => { assert.equal(x.tat, x.ct - x.at); assert.equal(x.wt, x.tat - x.bt); });
  }
});
test('CPU: idle time before the first arrival is shown and counted', () => {
  const r = cpu('FCFS', procs(['A', 3, 2]));
  assert.deepEqual([r.segs[0].i, r.segs[0].s, r.segs[0].e], [-1, 0, 3]); assert.equal(r.m.util, 40);
});
test('Pages: reference string 7 0 1 2 0 3 0 4 with 3 frames', () => {
  const refs = [7, 0, 1, 2, 0, 3, 0, 4];
  for (const [al, faults] of [['FIFO', 7], ['LRU', 6], ['OPT', 6]]) { const r = plain(W.pgSim(refs, 3, al)); assert.equal(r.flt, faults, al); assert.equal(r.hits + r.flt, refs.length); r.steps.forEach(s => assert.ok(s.fr.length <= 3)); }
});
test('Pages: FIFO ignores hits, LRU refreshes them, Optimal evicts never-used-again pages', () => {
  assert.equal(W.pgSim([1, 2, 1, 3], 2, 'FIFO').steps[3].ev, 1);
  assert.equal(W.pgSim([1, 2, 1, 3], 2, 'LRU').steps[3].ev, 2);
  assert.equal(W.pgSim([1, 2, 3, 1], 2, 'OPT').steps[2].ev, 2);
});
test('Disk: example queue from head 50 (range 0-199, direction Right)', () => {
  const v = { min: 0, max: 199, head: 50, dir: 'Right', rq: [82, 170, 43, 140, 24, 16, 190] };
  const want = { FCFS: 642, SSTF: 208, SCAN: 332, CSCAN: 391, LOOK: 314, CLOOK: 341 };
  for (const [al, total] of Object.entries(want)) {
    const r = plain(W.diskRun(al, v)); assert.equal(r.total, total, al);
    assert.deepEqual([...r.order].sort((a, b) => a - b), [...v.rq].sort((a, b) => a - b), al + ' serves each request exactly once');
    assert.equal(r.path.reduce((s, p) => s + p.d, 0), total);
  }
  assert.equal(W.diskRun('SCAN', { ...v, dir: 'Left' }).total, 240); assert.equal(W.diskRun('LOOK', { ...v, dir: 'Left' }).total, 208);
});
test("Banker's: classic safe state and an unsafe state", () => {
  const A = [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]], X = [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]];
  const safe = plain(W.bank(A, X, [3, 3, 2])); assert.ok(safe.steps.at(-1).safe); const seq = safe.steps.filter(s => !s.end).map(s => s.i);
  assert.deepEqual(seq, [1, 3, 0, 2, 4]);   // the app always picks the lowest-numbered eligible process; other safe sequences exist
  let w = [3, 3, 2]; for (const i of seq) { assert.ok(safe.N[i].every((v, j) => v <= w[j]), 'Need <= Work when P' + i + ' is chosen'); w = w.map((v, j) => v + A[i][j]); }
  assert.deepEqual(safe.N[0], [7, 4, 3]);
  assert.equal(W.bank(A, X, [0, 0, 0]).steps.at(-1).safe, false);
});

const ui = () => { const w = load(), d = w.document;
  return { set: (id, v) => { d.getElementById(id).value = v; }, run: k => d.querySelector(`#${k} [data-a=run]`).dispatchEvent(new w.MouseEvent('click', { bubbles: true })), err: k => d.querySelector(`#${k} .errs`).textContent }; };
test('Validation: CPU', () => {
  const u = ui(); u.set('cpu-p', 'P1, 0, 5\nP1, -1, 0'); u.run('cpu');
  assert.match(u.err('cpu'), /duplicate process ID/); assert.match(u.err('cpu'), /arrival time/); assert.match(u.err('cpu'), /burst time/);
  u.set('cpu-p', 'P1,0,5'); u.set('cpu-a', 'RR'); u.set('cpu-q', '0'); u.run('cpu'); assert.match(u.err('cpu'), /quantum/);
  u.set('cpu-p', ''); u.run('cpu'); assert.match(u.err('cpu'), /at least one process/);
});
test('Validation: pages, disk and Banker\'s', () => {
  const u = ui(); u.set('pg-r', ''); u.run('pg'); assert.match(u.err('pg'), /at least one page/);
  u.set('pg-r', '1,-2,3'); u.run('pg'); assert.match(u.err('pg'), /non-negative integer/);
  u.set('pg-r', '1,2,3'); u.set('pg-f', '0'); u.run('pg'); assert.match(u.err('pg'), /Frames/);
  u.set('dk-min', '10'); u.set('dk-max', '5'); u.run('dk'); assert.match(u.err('dk'), /minimum must be less than maximum/);
  u.set('dk-min', '0'); u.set('dk-max', '199'); u.set('dk-r', '300'); u.run('dk'); assert.match(u.err('dk'), /outside the disk range/);
  u.set('dk-r', '10'); u.set('dk-a', 'SCAN'); u.set('dk-d', ''); u.run('dk'); assert.match(u.err('dk'), /Direction is required/);
  u.set('bk-a', '2 0'); u.set('bk-x', '1 0'); u.set('bk-v', '1 1'); u.run('bk'); assert.match(u.err('bk'), /less than Allocation/);
  u.set('bk-a', '1 1\n1 1'); u.set('bk-x', '2 2'); u.run('bk'); assert.match(u.err('bk'), /Maximum has 1 row/);
  u.set('bk-x', '2 2\n2 2'); u.set('bk-v', '-1 1'); u.run('bk'); assert.match(u.err('bk'), /non-negative integer/);
});
test('UI: every algorithm runs and every step renders without errors', () => {
  const w = load(), d = w.document, click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); let runs = 0;
  for (const k of ['cpu', 'pg', 'dk', 'bk']) { const s = d.getElementById(k), sel = s.querySelector('select[id$=-a]'), opts = sel ? [...sel.options].map(o => o.value) : [''];
    for (const v of opts) {
      if (sel) { sel.value = v; sel.dispatchEvent(new w.Event('change', { bubbles: true })); }
      click(s.querySelector('[data-a=run]')); assert.equal(s.querySelector('.errs').textContent, '', k + ':' + v);
      const n = +s.querySelector('.st').textContent.match(/of (\d+)/)[1]; click(s.querySelector('[data-a=reset]'));
      for (let j = 0; j < n; j++) { click(s.querySelector('[data-a=next]')); assert.doesNotMatch(s.querySelector('.out').textContent, /NaN|undefined|\[object/, `${k}:${v} step ${j + 1}`); }
      const c = s.querySelector('[data-a=cmp]'); if (c) { click(c); assert.match(s.querySelector('.cmp').textContent, /Comparison/); } runs++;
    } }
  assert.equal(runs, 16);
});
