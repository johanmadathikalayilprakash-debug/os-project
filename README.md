# Interactive OS Algorithm Lab

An animated, beginner-friendly simulator for four core Operating Systems topics. The whole app is one file, `index.html`, that runs in the browser: no backend, no accounts, no internet needed.

> **Simulation only.** It never touches your computer's real scheduler, disk, memory or resources.

## Modules

| Module | Algorithms | What you see |
|---|---|---|
| CPU scheduling | FCFS, SJF, SRTF, Round Robin, Priority (preemptive and non-preemptive) | queue → CPU → finished animation, Gantt chart, AT/BT/CT/TAT/WT/RT table, averages, utilization, throughput |
| Page replacement | FIFO, LRU, Optimal | animated memory frames, hit/fault trace, hit and fault ratios |
| Disk scheduling | FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK | head sliding along a track, path chart, movement table, total head movement |
| Banker's algorithm | Safety check | Allocation / Maximum / Need tables, Work updates, safe sequence or unsafe explanation |

Every module has plain-English narration of each step, Run / Prev / Next / Play / Pause / Reset, three speeds, an example loader, input validation with clear messages, a decision log and **Compare all** (every algorithm on identical input, shown as numbers).

## Quick start

Open `index.html` in any modern browser. To host it for free, push the repo and turn on GitHub Pages (Settings → Pages → Deploy from a branch → `main` / root).

## Tests

Needs Node 20 or newer.

```bash
npm install
npm test
```

The tests load `index.html` in jsdom and check the real algorithm code: hand-calculated results for the example inputs of every algorithm, invariants (each process runs exactly its burst time, every disk request is served once, hits + faults = references, and so on), input validation for all four modules, and a UI smoke test that runs every algorithm and steps through every frame. GitHub Actions runs them on each push (`.github/workflows/test.yml`).

## Windows desktop app (.exe)

```bash
npm run build:exe
```

This wraps `index.html` with [Neutralino](https://neutralino.js.org) (MIT licence) and writes `desktop/dist/os-algorithm-lab/os-algorithm-lab-win_x64.exe`, a single file with the app embedded. The first run downloads the Neutralino binaries, so it needs internet. The window/app icon is `desktop/resources/icons/appIcon.png`; replace it to change the icon. Windows 10/11 needs the WebView2 runtime (already present on most machines). The exe is unsigned, so SmartScreen may warn; attach it to a GitHub Release instead of committing it. The build has been verified to produce a Windows executable but has not been run on a physical Windows machine yet.

## Project structure

```
index.html            the whole app (HTML + CSS + JS; algorithms are plain functions)
tests/app.test.js     automated tests
scripts/build-exe.js  builds the optional .exe
desktop/              Neutralino config and icon for the .exe
.github/workflows/    CI that runs the tests
```

## Conventions (so results are reproducible)

- **CPU:** ties go to the earlier arrival, then input order. SRTF and preemptive Priority let the running process continue on a tie; only a strictly better process preempts. Priority: lower number = higher priority. Round Robin queues processes that arrive exactly when a quantum ends *before* re-queuing the expired process. Idle gaps are shown in the Gantt chart. TAT = CT − AT, WT = TAT − BT, RT = first CPU start − AT, utilization = busy time ÷ time from 0 to the last completion, throughput = processes ÷ that same time.
- **Page replacement:** FIFO evicts the longest-resident page and hits do not reorder it; LRU evicts the page unused for longest and hits refresh it; Optimal evicts the page used farthest in the future (never-used-again first, ties to the lowest frame).
- **Disk:** every cylinder travelled counts, including SCAN/C-SCAN runs to the boundary and C-SCAN/C-LOOK wrap jumps. SCAN and C-SCAN always run to the boundary; LOOK and C-LOOK turn or wrap at the last request. SSTF ties go to the lower cylinder, then input order. A request at the head position costs 0.
- **Banker's:** Need = Maximum − Allocation. Each pass picks the lowest-numbered unfinished process whose Need fits in Work, so the safe sequence can differ from a textbook's (any valid one is correct). An unsafe state is not a deadlock that has already happened.

Limits: 100 processes (times up to 1000), 200 page references with 1–20 frames, 100 disk requests, Banker's matrices up to 20 × 10.

## Known limitations and future work

- Plain HTML/CSS/JS in one file rather than a React + Vite project; splitting the algorithms into modules is a natural next step.
- No benchmarks, no academic report and no dedicated comparison charts yet.
- Pseudocode and worked examples are only partly covered in the in-app Learn tab.

## Push to GitHub

```bash
git init -b main
git add .
git commit -m "Add Interactive OS Algorithm Lab"
git remote add origin https://github.com/<your-username>/os-algorithm-lab.git
git push -u origin main
```

## Credits

Author / team, course and guide: _add yours here_. Third-party: [jsdom](https://github.com/jsdom/jsdom) (tests, MIT), [Neutralino](https://neutralino.js.org) (desktop wrapper, MIT). No licence has been chosen for this project yet; add a `LICENSE` file before making the repo public if you want others to reuse it.
