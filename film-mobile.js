/* ════════════════════════════════════════════════════════════════════════
   DONEBUILD MOBILE HERO FILM CONTROLLER
   Phone-centered mobile version, audio-synced to the same Southern Elm Ct
   walkthrough as the desktop film. Compressed to ~20s SPEAK + 12s tail.

   Stages (ms offsets):
     0      SETUP_END      800   - phone slides up
     800    SPEAK_END      20800 - 20s typing + trust panel ticks
     20800  CLARIFY_END    23800 - 3s "cabinet grade?" + auto-pick semi
     23800  DRAFT_END      26300 - 2.5s drafting checklist
     26300  REVEAL_END     30300 - 4s category cascade + total counts up
     30300  LINGER_END     32300 - 2s linger + replay
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const ST = {
    SETUP_END:    800,
    SPEAK_END:    20800,
    CLARIFY_END:  23800,
    DRAFT_END:    26300,
    REVEAL_END:   30300,
    LOOP_END:     32300,
  };
  const SPEAK_START   = ST.SETUP_END;
  const CLARIFY_START = ST.SPEAK_END;
  const DRAFT_START   = ST.CLARIFY_END;
  const REVEAL_START  = ST.DRAFT_END;
  const LINGER_START  = ST.REVEAL_END;

  // Audio file is 19.7s; SPEAK stage is 20s, audio plays at ~natural rate.
  const AUDIO_DURATION_S = 19.7;
  const SPEAK_DURATION_S = (ST.SPEAK_END - SPEAK_START) / 1000; // 20s
  const AUDIO_RATE = AUDIO_DURATION_S / SPEAK_DURATION_S;       // ~0.985x

  // ─── DOM (mobile-only nodes prefixed `m`) ────────────────────────────
  const root = document.getElementById("heroMobile");
  if (!root) return; // no mobile markup → bail

  const $  = (sel) => root.querySelector(sel);
  const $$ = (sel) => root.querySelectorAll(sel);

  const audio        = document.getElementById("heroAudio");
  const heroSubM     = $("#mHeroSub");
  const screens      = $$(".m-screen");
  const wave         = $("#mWave");
  const speakTimer   = $("#mSpeakTimer");
  const transcriptEl = $("#mTranscript");
  const trustItems   = $$(".m-trust-item");
  const draftSteps   = $$(".m-draft-step");
  const catCards     = $$(".m-cat-card");
  const totalEl      = $("#mTotal");
  const budgetPctEl  = $("#mBudgetPct");
  const tilePicker   = $("#mTilePicker");
  const tileCeramic  = $("#mTileCeramic");
  const tilePorcelain= $("#mTilePorcelain");
  const totalDelta   = $("#mTotalDelta");
  const bsTotal      = $("#mBsTotal");
  const bsItem       = $("#mBsItem");
  const bsPrice      = $("#mBsPrice");
  const bsUpdated    = $("#mBsUpdated");
  const bsDelta      = $("#mBsDelta");
  const sendBtn      = $("#mSendBtn");
  const buildingBtn  = $("#mBuildingBtn");
  const progressFill = $("#mProgressFill");
  const progressLabels = $$(".m-prog-label");
  const replayBtn    = $("#mReplayBtn");
  const confirmedRow = $("#mConfirmed");
  const clarifyOpts  = $$(".m-clarify-opt");
  const clarifyBuild = $("#mClarifyBuild");

  // ─── DATA — same real PHRASES as desktop ────────────────────────────
  const PHRASES = [
    { audioStart: 1.08,  text: "All right." },
    { audioStart: 2.06,  text: "Kitchen remodel for the Chen apartment." },
    { audioStart: 6.42,  text: "Demo the existing cabinets and counters," },
    { audioStart: 8.46,  text: "install shaker cabinets," },
    { audioStart: 10.28, text: "go with maple," },
    { audioStart: 11.72, text: "quartz countertops about thirty linear feet," },
    { audioStart: 14.96, text: "subway tile backsplash," },
    { audioStart: 16.44, text: "new sink and faucet," },
    { audioStart: 17.82, text: "recessed lighting and paint." },
  ];

  const audioSToFilmMs = (s) => SPEAK_START + (s / AUDIO_RATE) * 1000;

  const TRUST_TRIGGERS = {
    job:      audioSToFilmMs(5.20),
    layout:   audioSToFilmMs(8.50),
    size:     audioSToFilmMs(11.30),
    finish:   audioSToFilmMs(15.20),
  };

  const SUBHEADS = {
    setup:   "This is what 22 seconds with DoneBuild looks like.",
    speak:   "You talk through the job at the table…",
    clarify: "One small thing wasn't clear.",
    draft:   "Pulling from her saved prices.",
    reveal:  "Categorizing line items.",
    linger:  "Done. $43,199 — ready to send.",
  };

  // Reveal cascade values (cumulative subtotals; * 1.0888 multiplier matches JSX)
  const CAT_TIMES = [0, 480, 960, 1440, 1920, 2400, 2880, 3360];
  const CAT_VALS  = [3200, 17220, 22620, 25420, 27148, 32348, 34198, 34678];
  const EST_BASE  = 43199;
  const EST_BUMP  = 43619;
  const BUDGET    = 50000;

  // ─── BUILD WAVE BARS ──────────────────────────────────────────────
  function buildWave() {
    if (!wave) return;
    const N = 24;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < N; i++) {
      const span = document.createElement("span");
      span.className = "m-wave-bar";
      const dur = 0.7 + (i % 4) * 0.15;
      const delay = i * 0.04;
      span.style.animation = `mWave ${dur}s ease-in-out ${delay}s infinite alternate`;
      span.style.height = `${30 + Math.abs(Math.sin(i * 0.5)) * 70}%`;
      frag.appendChild(span);
    }
    wave.appendChild(frag);
  }
  buildWave();

  // ─── STATE ────────────────────────────────────────────────────────
  let startedAt = 0;
  let paused = false;
  let rafId = null;
  let lastStage = "";
  let lastScreen = "";

  function setScreen(name) {
    if (name === lastScreen) return;
    lastScreen = name;
    screens.forEach(s => s.classList.toggle("is-active", s.dataset.screen === name));
  }

  function setStage(name) {
    if (name === lastStage) return;
    lastStage = name;
    if (heroSubM && SUBHEADS[name]) {
      heroSubM.textContent = SUBHEADS[name];
      heroSubM.style.animation = "none";
      void heroSubM.offsetHeight;
      heroSubM.style.animation = "mFadeUp 320ms ease-out";
    }
    const progMap = {
      setup: null, speak: "speak", clarify: "clarify",
      draft: "draft", reveal: "reveal", linger: "priced",
    };
    const cur = progMap[name];
    progressLabels.forEach(l => l.classList.toggle("is-current", l.dataset.stage === cur));

    // Map narrative stages to phone screens
    const screenMap = { setup: "speak", speak: "speak", clarify: "clarify", draft: "draft", reveal: "estimate", linger: "estimate" };
    setScreen(screenMap[name]);
  }

  function updateTimer(elapsedMs) {
    if (!speakTimer) return;
    if (elapsedMs < SPEAK_START) { speakTimer.textContent = "0:00"; return; }
    const speakElapsed = Math.max(0, elapsedMs - SPEAK_START);
    const seconds = Math.min(32, Math.floor(speakElapsed / 625)); // ~32s in 20s
    const mm = Math.floor(seconds / 60);
    const ss = String(seconds % 60).padStart(2, "0");
    speakTimer.textContent = `${mm}:${ss}`;
  }

  function updateTranscript(elapsedMs) {
    if (!transcriptEl) return;
    if (elapsedMs < SPEAK_START + 200) {
      transcriptEl.innerHTML = '<span class="m-transcript-placeholder">Listening for the job description…</span><span class="m-cursor"></span>';
      return;
    }
    let revealed = "";
    for (const p of PHRASES) {
      const filmMs = audioSToFilmMs(p.audioStart);
      if (elapsedMs >= filmMs) revealed += (revealed ? " " : "") + p.text;
    }
    if (!revealed) {
      transcriptEl.innerHTML = '<span class="m-transcript-placeholder">Listening for the job description…</span><span class="m-cursor"></span>';
    } else {
      transcriptEl.innerHTML = `${revealed}<span class="m-cursor"></span>`;
    }
  }

  function updateTrust(elapsedMs) {
    trustItems.forEach(t => {
      const trig = TRUST_TRIGGERS[t.dataset.trust];
      if (typeof trig === "number") {
        t.classList.toggle("is-on", elapsedMs >= trig);
      }
    });
  }

  function updateClarify(elapsedMs) {
    if (lastStage !== "clarify") return;
    const clarifyEl = elapsedMs - CLARIFY_START;
    const autoPickAt = 1500;
    clarifyOpts.forEach(o => {
      o.classList.toggle("is-picked", o.dataset.opt === "semi" && clarifyEl > autoPickAt);
      o.classList.toggle("is-ringing", o.dataset.opt === "semi" && clarifyEl > autoPickAt && clarifyEl < autoPickAt + 700);
    });
    if (clarifyBuild) {
      const picked = clarifyEl > autoPickAt;
      clarifyBuild.classList.toggle("is-active", picked);
      clarifyBuild.classList.toggle("is-loading", clarifyEl > autoPickAt + 800);
    }
  }

  function updateDraft(elapsedMs) {
    if (lastStage !== "draft") {
      draftSteps.forEach(s => { s.classList.remove("is-done"); s.classList.remove("is-active"); });
      return;
    }
    const e = elapsedMs - DRAFT_START;
    const ts = [0, 500, 1000, 1500, 2000];
    draftSteps.forEach((step, i) => {
      const isDone = e >= ts[i] + 400;
      const isActive = e >= ts[i] && e < ts[i] + 400;
      step.classList.toggle("is-done", isDone);
      step.classList.toggle("is-active", isActive);
    });
  }

  function updateReveal(elapsedMs) {
    const inReveal = lastStage === "reveal" || lastStage === "linger";
    if (!inReveal) {
      catCards.forEach(c => c.classList.remove("is-shown"));
      if (totalEl) totalEl.textContent = "$0";
      if (budgetPctEl) budgetPctEl.style.width = "0%";
      return;
    }
    const elapsed = elapsedMs - REVEAL_START;
    catCards.forEach((c, i) => {
      const at = parseInt(c.dataset.at, 10);
      c.classList.toggle("is-shown", elapsed >= at);
    });

    let displayed = 0;
    if (lastStage === "linger") {
      displayed = EST_BASE;
    } else {
      let subtotal = 0;
      for (let i = 0; i < CAT_TIMES.length; i++) {
        if (elapsed >= CAT_TIMES[i]) subtotal = CAT_VALS[i];
      }
      displayed = Math.round(subtotal * 1.0888);
    }

    // Linger: backsplash bump
    const lingerEl = lastStage === "linger" ? elapsedMs - LINGER_START : 0;
    const bumpAt = 800;
    const bumped = lastStage === "linger" && lingerEl > bumpAt;
    if (bumped) {
      const p = Math.min(1, (lingerEl - bumpAt) / 600);
      displayed = Math.round(EST_BASE + (EST_BUMP - EST_BASE) * (1 - Math.pow(1 - p, 3)));
    }

    if (totalEl) totalEl.textContent = "$" + displayed.toLocaleString();
    if (budgetPctEl) {
      const pct = Math.min(100, (displayed / BUDGET) * 100);
      budgetPctEl.style.width = pct + "%";
    }

    // Backsplash row + tile picker
    if (lastStage === "linger") {
      if (tilePicker) tilePicker.classList.add("is-shown");
      if (tilePorcelain && tileCeramic) {
        tilePorcelain.classList.toggle("is-selected", bumped);
        tileCeramic.classList.toggle("is-selected", !bumped);
        tilePorcelain.classList.toggle("is-tap-ring", bumped && lingerEl < bumpAt + 700);
      }
      if (bumped) {
        if (bsItem) bsItem.textContent = "Porcelain subway tile";
        if (bsPrice) bsPrice.textContent = "$3,220";
        if (bsTotal) bsTotal.textContent = "$3,220";
        if (bsUpdated) bsUpdated.classList.toggle("is-shown", lingerEl < bumpAt + 2400);
        if (bsDelta) bsDelta.classList.toggle("is-shown", lingerEl < bumpAt + 2400);
        if (totalDelta) totalDelta.classList.toggle("is-shown", lingerEl > bumpAt && lingerEl < bumpAt + 2400);
      } else {
        if (bsItem) bsItem.textContent = "Ceramic subway tile";
        if (bsPrice) bsPrice.textContent = "$2,800";
        if (bsTotal) bsTotal.textContent = "$2,800";
        if (bsUpdated) bsUpdated.classList.remove("is-shown");
        if (bsDelta) bsDelta.classList.remove("is-shown");
        if (totalDelta) totalDelta.classList.remove("is-shown");
      }
      if (sendBtn) sendBtn.classList.add("is-shown");
      if (buildingBtn) buildingBtn.classList.remove("is-shown");
    } else {
      if (sendBtn) sendBtn.classList.remove("is-shown");
      if (buildingBtn) buildingBtn.classList.add("is-shown");
      if (tilePicker) tilePicker.classList.remove("is-shown");
    }
  }

  function updateProgress(elapsedMs) {
    if (!progressFill) return;
    const pct = Math.min(100, (elapsedMs / ST.LOOP_END) * 100);
    progressFill.style.width = pct + "%";
    progressFill.classList.toggle("is-paused", paused);
  }

  // ─── TICK ──────────────────────────────────────────────────────────
  function getStage(t) {
    return t < ST.SETUP_END ? "setup"
         : t < ST.SPEAK_END ? "speak"
         : t < ST.CLARIFY_END ? "clarify"
         : t < ST.DRAFT_END ? "draft"
         : t < ST.REVEAL_END ? "reveal"
         : "linger";
  }

  function tick(now) {
    if (paused) return;
    let elapsed;
    if (audio && !audio.paused && audio.currentTime > 0 && audio.currentTime < AUDIO_DURATION_S - 0.05) {
      // Audio-driven SPEAK time. Outside SPEAK stage we fall back to wall clock since pause.
      elapsed = audioSToFilmMs(audio.currentTime);
    } else {
      elapsed = now - startedAt;
    }

    if (elapsed >= ST.LOOP_END) {
      elapsed = ST.LOOP_END - 1;
      paused = true;
      setStage("linger");
      updateReveal(elapsed);
      updateProgress(elapsed);
      if (replayBtn) replayBtn.classList.add("is-shown");
      cancelAnimationFrame(rafId);
      return;
    }

    setStage(getStage(elapsed));
    updateTimer(elapsed);
    updateTranscript(elapsed);
    updateTrust(elapsed);
    updateClarify(elapsed);
    updateDraft(elapsed);
    updateReveal(elapsed);
    updateProgress(elapsed);
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    paused = false;
    startedAt = performance.now();
    if (replayBtn) replayBtn.classList.remove("is-shown");
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function replay() {
    // Reset audio if available
    if (audio) {
      try { audio.currentTime = 0; if (!audio.paused) audio.play().catch(() => {}); } catch (_) {}
    }
    start();
  }

  if (replayBtn) replayBtn.addEventListener("click", replay);

  // Don't auto-start until mobile hero is actually visible (matchMedia).
  const mq = window.matchMedia("(max-width: 900px)");
  let started = false;
  function maybeStart() {
    if (mq.matches && !started) {
      started = true;
      start();
    }
  }
  // Initial check after a tick (in case of race with desktop film)
  if (mq.matches) {
    // Defer to next frame so audio element is hooked
    requestAnimationFrame(maybeStart);
  }
  mq.addEventListener("change", maybeStart);

  // Re-sync to audio when audio plays (mute toggle)
  if (audio) {
    audio.addEventListener("play", () => {
      if (mq.matches && audio.currentTime < AUDIO_DURATION_S) {
        // Sync film start to audio currentTime
        startedAt = performance.now() - audioSToFilmMs(audio.currentTime);
        if (paused) { paused = false; rafId = requestAnimationFrame(tick); }
      }
    });
  }
})();
