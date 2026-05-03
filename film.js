/* ════════════════════════════════════════════════════════════════════════
   DONEBUILD HERO FILM CONTROLLER
   Drives the in-product UI replica through 5 stages, synced to a real
   19.7s recording of Tommy's actual job walkthrough (full length).

   Stages (ms offsets, total LOOP_END = 32000ms - a 32s loop):
     0      SETUP_END     1000  - laptop rises in
     1000   SPEAK_END     21000 - 20s typing transcript + trust panel ticks
     21000  CLARIFY_END   24000 - 3s "cabinet grade?" + auto-pick semi
     24000  DRAFT_END     26500 - 2.5s drafting checklist
     26500  REVEAL_END    30000 - 3.5s category cascade + total counts up
     30000  LOOP_END      32000 - 2s linger with backsplash tile picker
   ════════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── TIMING ────────────────────────────────────────────────────────────
  const ST = {
    SETUP_END:    1000,
    SPEAK_END:    21000,
    CLARIFY_END:  24000,
    DRAFT_END:    26500,
    REVEAL_END:   30000,
    LOOP_END:     32000,
  };
  const SPEAK_START   = ST.SETUP_END;
  const CLARIFY_START = ST.SPEAK_END;
  const DRAFT_START   = ST.CLARIFY_END;
  const REVEAL_START  = ST.DRAFT_END;
  const LINGER_START  = ST.REVEAL_END;

  // Audio file is 19.7s; SPEAK stage is 20s, so audio plays at ~natural rate.
  const AUDIO_DURATION_S = 19.7;
  const SPEAK_DURATION_S = (ST.SPEAK_END - SPEAK_START) / 1000; // 20s
  const AUDIO_RATE = AUDIO_DURATION_S / SPEAK_DURATION_S;       // ~0.985x

  // ─── DOM ───────────────────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const audio        = $("#heroAudio");
  const muteBtn      = $("#muteBtn");
  const muteIcon     = $("#muteIcon");
  const muteLabel    = $("#muteLabel");
  const heroSub      = $("#heroSub");
  const stageEl      = $("#stage");
  const surfaces     = $$(".surface");
  const wave         = $("#wave");
  const speakTimer   = $("#speakTimer");
  const transcriptEl = $("#transcript");
  const trustItems   = $$(".surface-speak .trust-item");
  const draftChecks  = $$("#draftChecks .draft-check");
  const catCards     = $$("#catList .cat-card");
  const summaryTotal = $("#summaryTotal");
  const summaryBar   = $("#summaryBar");
  const summaryPct   = $("#summaryPct");
  const sumSubtotal  = $("#sumSubtotal");
  const bsTotal      = $("#bsTotal");
  const bsTotalCell  = $("#bsTotalCell");
  const bsCost       = $("#bsCost");
  const bsPrice      = $("#bsPrice");
  const bsItemText   = $("#bsItemText");
  const bsDelta      = $("#bsDelta");
  const bsUpdatedBadge = $("#bsUpdatedBadge");
  const tilePicker   = $("#tilePicker");
  const tileCeramic  = $("#tileCeramic");
  const tilePorcelain= $("#tilePorcelain");
  const confirmedCard= $("#confirmedCard");
  const progressFill = $("#progressFill");
  const progressLabels = $$(".progress-label");
  const replayBtn    = $("#replayBtn");

  // ─── DATA ──────────────────────────────────────────────────────────────
  // Tommy's actual transcript phrases with timestamps in audio time (s).
  // Projected onto SPEAK 20s window at audio rate ~0.985x (near-natural).
  const PHRASES = [
    { audioStart: 1.08,  audioEnd: 1.56,  text: "All right." },
    { audioStart: 2.06,  audioEnd: 5.02,  text: "Kitchen remodel for the Chen apartment." },
    { audioStart: 6.42,  audioEnd: 8.36,  text: "Demo the existing cabinets and counters," },
    { audioStart: 8.46,  audioEnd: 10.02, text: "install shaker cabinets," },
    { audioStart: 10.28, audioEnd: 11.18, text: "go with maple," },
    { audioStart: 11.72, audioEnd: 14.72, text: "quartz countertops about thirty linear feet," },
    { audioStart: 14.96, audioEnd: 16.28, text: "subway tile backsplash," },
    { audioStart: 16.44, audioEnd: 17.46, text: "new sink and faucet," },
    { audioStart: 17.82, audioEnd: 19.12, text: "recessed lighting and paint." },
  ];
  const CLEANUP_TOKENS = [
    { start: 0.62, end: 1.28, text: "Uh," },
  ];

  function buildTranscriptTokens(phrases) {
    const tokens = [];
    phrases.forEach((phrase) => {
      const words = phrase.text.match(/\S+/g) || [];
      const duration = Math.max(0.2, phrase.audioEnd - phrase.audioStart);
      const slot = duration / Math.max(1, words.length);
      words.forEach((word, index) => {
        tokens.push({
          start: phrase.audioStart + slot * index + Math.min(0.08, slot * 0.35),
          text: word,
        });
      });
    });
    return tokens;
  }

  const TRANSCRIPT_TOKENS = buildTranscriptTokens(PHRASES);

  function getLiveTranscript(audioElapsedS) {
    const words = [];
    CLEANUP_TOKENS.forEach((token) => {
      if (audioElapsedS >= token.start && audioElapsedS < token.end) words.push(token.text);
    });
    TRANSCRIPT_TOKENS.forEach((token) => {
      if (audioElapsedS >= token.start) words.push(token.text);
    });
    return words.join(" ");
  }

  function scrollTranscriptToEnd() {
    if (!transcriptEl) return;
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  // Convert audio-time seconds to film-time ms (within SPEAK stage)
  const audioSToFilmMs = (audioS) => SPEAK_START + (audioS / AUDIO_RATE) * 1000;

  // Trust panel reveal trigger times (in film-ms), aligned to phrases.
  const TRUST_TRIGGERS = {
    job:      audioSToFilmMs(5.20),   // after "Kitchen remodel for the Chen apartment."
    scope:    audioSToFilmMs(8.50),   // after "demo existing cabinets and counters"
    cabinets: audioSToFilmMs(11.30),  // after "shaker cabinets, go with maple"
    finish:   audioSToFilmMs(15.20),  // after "quartz countertops about thirty linear feet"
  };

  // Hero subhead per stage
  const SUBHEADS = {
    setup:   "This is what 22 seconds with DoneBuild looks like.",
    speak:   "You're describing the job at the table…",
    clarify: "One small thing wasn't clear.",
    draft:   "Pulling from your saved prices.",
    reveal:  "Categorizing line items.",
    linger:  "Done. $43,199. Ready to send.",
  };

  // Estimate target value (counts up during reveal)
  const EST_BASE = 43199;
  const EST_BUMPED = 43619; // +$420 backsplash upgrade
  const BUDGET = 50000;

  // ─── BUILD WAVE BARS ───────────────────────────────────────────────────
  function buildWaveBars() {
    const N = 30;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < N; i++) {
      const span = document.createElement("span");
      span.className = "wave-bar";
      // Stagger animation start + duration variance (matches JSX spec)
      const dur = 0.65 + (i % 5) * 0.13;
      const delay = i * 0.035;
      span.style.animation = `waveBar ${dur}s ease-in-out ${delay}s infinite alternate`;
      frag.appendChild(span);
    }
    wave.appendChild(frag);
  }
  buildWaveBars();

  // ─── STATE ─────────────────────────────────────────────────────────────
  let startedAt = 0;
  let paused = false;
  let rafId = null;
  let lastStage = "";
  let muted = true;
  let bsUpgradedFlag = false;
  let summaryAnimatedFor = -1;

  // ─── HELPERS ───────────────────────────────────────────────────────────
  function setStage(stageName) {
    if (stageName === lastStage) return;
    lastStage = stageName;

    // Map narrative stages to surface names
    const surfaceMap = {
      setup: "speak",
      speak: "speak",
      clarify: "clarify",
      draft: "draft",
      reveal: "priced",
      linger: "priced",
    };
    const want = surfaceMap[stageName];
    surfaces.forEach(s => {
      s.classList.toggle("is-active", s.dataset.stage === want);
    });

    // Hero subhead
    if (heroSub && SUBHEADS[stageName]) {
      heroSub.textContent = SUBHEADS[stageName];
      heroSub.style.animation = "none";
      // Force reflow to restart animation
      // eslint-disable-next-line no-unused-expressions
      heroSub.offsetHeight;
      heroSub.style.animation = "fadeUp 320ms ease-out";
    }

    // Progress label highlight
    const progStageMap = {
      setup: null, speak: "speak", clarify: "clarify", draft: "draft",
      reveal: "reveal", linger: "priced",
    };
    const cur = progStageMap[stageName];
    progressLabels.forEach(l => {
      l.classList.toggle("is-current", l.dataset.stage === cur);
    });
  }

  function updateTimer(elapsedMs) {
    if (elapsedMs < SPEAK_START) {
      speakTimer.textContent = "00:00";
      return;
    }
    // Display as a natural-feeling timer up to ~30s
    const speakElapsed = Math.max(0, elapsedMs - SPEAK_START);
    // Speed it ~3x to land near 30s by stage end (matches JSX)
    const seconds = Math.min(32, Math.floor(speakElapsed / 297));
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    speakTimer.textContent = `${mm}:${ss}`;
  }

  function updateTranscript(elapsedMs) {
    if (elapsedMs < SPEAK_START + 200) {
      transcriptEl.innerHTML =
        '<span class="speak-transcript-placeholder">Listening for the job description…</span>' +
        '<span class="speak-cursor"></span>';
      return;
    }

    // Compute audio time corresponding to film time
    const audioElapsedS = ((elapsedMs - SPEAK_START) / 1000) * AUDIO_RATE;

    const out = getLiveTranscript(audioElapsedS);

    if (!out) {
      transcriptEl.innerHTML =
        '<span class="speak-transcript-placeholder">Listening for the job description…</span>' +
        '<span class="speak-cursor"></span>';
    } else {
      transcriptEl.innerHTML =
        '<span class="speak-transcript-text"></span>' +
        '<span class="speak-cursor"></span>';
      transcriptEl.firstChild.textContent = out;
      scrollTranscriptToEnd();
    }
  }

  function updateTrust(elapsedMs) {
    trustItems.forEach(item => {
      const trigger = TRUST_TRIGGERS[item.dataset.trust];
      if (trigger != null && elapsedMs >= trigger) {
        item.classList.add("is-on");
      } else {
        item.classList.remove("is-on");
      }
    });
  }

  function updateClarify(elapsedMs) {
    if (elapsedMs < CLARIFY_START || elapsedMs >= ST.CLARIFY_END) {
      $$(".clarify-opt").forEach(o => o.classList.remove("is-picked"));
      // Remove any old ripples
      $$(".opt-ripple").forEach(r => r.remove());
      const buildBtn = $(".clarify-foot-actions .btn-pri-app");
      if (buildBtn) {
        buildBtn.classList.add("is-disabled");
        buildBtn.classList.remove("is-on");
      }
      return;
    }
    const local = elapsedMs - CLARIFY_START;
    const autoPickAt = 1500;
    if (local >= autoPickAt) {
      const semi = $('.clarify-opt[data-opt="semi"]');
      if (semi && !semi.classList.contains("is-picked")) {
        // Clear other picks
        $$(".clarify-opt").forEach(o => o.classList.remove("is-picked"));
        semi.classList.add("is-picked");
        // Add tap ripple
        if (!semi.querySelector(".opt-ripple")) {
          const ripple = document.createElement("span");
          ripple.className = "opt-ripple";
          semi.appendChild(ripple);
          setTimeout(() => ripple.remove(), 700);
        }
        // Enable build button
        const buildBtn = $(".clarify-foot-actions .btn-pri-app");
        if (buildBtn) buildBtn.classList.remove("is-disabled");
      }
    }
  }

  function updateDrafting(elapsedMs) {
    if (elapsedMs < DRAFT_START || elapsedMs >= ST.DRAFT_END) {
      draftChecks.forEach(c => { c.classList.remove("is-active"); c.classList.remove("is-done"); });
      return;
    }
    const local = elapsedMs - DRAFT_START;
    const total = ST.DRAFT_END - DRAFT_START; // 2500ms
    const stepDur = total / draftChecks.length; // 500ms each
    draftChecks.forEach((c, i) => {
      c.classList.remove("is-active");
      c.classList.remove("is-done");
      const start = i * stepDur;
      const end = (i + 1) * stepDur;
      if (local >= end) {
        c.classList.add("is-done");
      } else if (local >= start) {
        c.classList.add("is-active");
      }
    });
  }

  function updateReveal(elapsedMs) {
    if (elapsedMs < REVEAL_START) {
      catCards.forEach(c => c.classList.remove("is-visible"));
      summaryTotal.textContent = "$0";
      summaryBar.style.width = "0%";
      summaryPct.textContent = "0%";
      sumSubtotal.textContent = "$0";
      return;
    }
    const local = elapsedMs - REVEAL_START;
    catCards.forEach(c => {
      const at = parseInt(c.dataset.reveal || "0", 10);
      // Scale category reveal to fit in 3.5s window (REVEAL_END - REVEAL_START)
      const scaledAt = (at / 2660) * 2200; // pack 8 cats into 2.2s
      if (local >= scaledAt) {
        c.classList.add("is-visible");
      } else {
        c.classList.remove("is-visible");
      }
    });

    // Total counts up. Animate over 2.5s starting at REVEAL_START.
    const countDur = 2500;
    const t = Math.min(1, local / countDur);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const target = bsUpgradedFlag ? EST_BUMPED : EST_BASE;
    const value = Math.round(target * eased);
    summaryTotal.textContent = "$" + value.toLocaleString();
    sumSubtotal.textContent = "$" + value.toLocaleString();

    const pct = Math.min(100, Math.round((target / BUDGET) * 100 * eased));
    summaryBar.style.width = pct + "%";
    summaryPct.textContent = pct + "%";
  }

  function updateLinger(elapsedMs) {
    if (elapsedMs < LINGER_START) {
      bsUpgradedFlag = false;
      // Reset backsplash to ceramic baseline
      tilePicker.style.display = "none";
      tileCeramic.classList.add("is-selected");
      tileCeramic.classList.remove("is-dim");
      tilePorcelain.classList.remove("is-selected");
      tilePorcelain.classList.add("is-dim");
      bsItemText.textContent = "Ceramic subway tile · supply + install";
      bsCost.textContent = "$42";
      bsPrice.textContent = "$87.50";
      bsTotalCell.textContent = "$2,800";
      bsTotal.textContent = "$2,800";
      bsDelta.style.display = "none";
      bsUpdatedBadge.style.display = "none";
      confirmedCard.style.display = "none";
      summaryAnimatedFor = -1;
      return;
    }
    const local = elapsedMs - LINGER_START;
    // Show tile picker immediately
    tilePicker.style.display = "block";

    // Backsplash auto-upgrade at +800ms
    const upgradeAt = 800;
    if (local >= upgradeAt && !bsUpgradedFlag) {
      bsUpgradedFlag = true;
      // Swap selection
      tileCeramic.classList.remove("is-selected");
      tileCeramic.classList.add("is-dim");
      tilePorcelain.classList.add("is-selected");
      tilePorcelain.classList.remove("is-dim");
      // Add tap ring
      if (!tilePorcelain.querySelector(".tile-tap-ring")) {
        const ring = document.createElement("span");
        ring.className = "tile-tap-ring";
        tilePorcelain.appendChild(ring);
        setTimeout(() => ring.remove(), 700);
      }
      // Update line item
      bsItemText.textContent = "Porcelain subway tile · supply + install";
      bsCost.textContent = "$48";
      bsPrice.textContent = "$100.60";
      bsTotalCell.textContent = "$3,220";
      bsTotal.textContent = "$3,220";
      bsDelta.style.display = "inline";
      bsUpdatedBadge.style.display = "inline-flex";
      // Update summary total to bumped value with pulse
      summaryTotal.textContent = "$" + EST_BUMPED.toLocaleString();
      sumSubtotal.textContent = "$" + EST_BUMPED.toLocaleString();
      summaryTotal.classList.add("is-bumped");
      setTimeout(() => summaryTotal.classList.remove("is-bumped"), 800);
      const pct = Math.round((EST_BUMPED / BUDGET) * 100);
      summaryBar.style.width = pct + "%";
      summaryPct.textContent = pct + "%";
    }

    // Confirmed card at +1400ms
    if (local >= 1400) {
      confirmedCard.style.display = "flex";
    }
  }

  function updateProgress(elapsedMs) {
    const pct = Math.min(100, (elapsedMs / ST.LOOP_END) * 100);
    progressFill.style.width = pct + "%";
    progressFill.classList.toggle("is-paused", paused);
  }

  // ─── MAIN LOOP ─────────────────────────────────────────────────────────
  function tick(now) {
    if (paused) return;
    const elapsed = now - startedAt;

    if (elapsed >= ST.LOOP_END) {
      // Pause on linger end. Auto-restart after 3s, OR replay button.
      pauseFilm(true);
      return;
    }

    // Determine stage
    let stage = "setup";
    if (elapsed >= LINGER_START)        stage = "linger";
    else if (elapsed >= REVEAL_START)   stage = "reveal";
    else if (elapsed >= DRAFT_START)    stage = "draft";
    else if (elapsed >= CLARIFY_START)  stage = "clarify";
    else if (elapsed >= SPEAK_START)    stage = "speak";

    setStage(stage);
    updateTimer(elapsed);
    updateTranscript(elapsed);
    updateTrust(elapsed);
    updateClarify(elapsed);
    updateDrafting(elapsed);
    updateReveal(elapsed);
    updateLinger(elapsed);
    updateProgress(elapsed);

    rafId = requestAnimationFrame(tick);
  }

  function startFilm() {
    paused = false;
    bsUpgradedFlag = false;
    summaryAnimatedFor = -1;

    // Reset visual state
    surfaces.forEach(s => s.classList.toggle("is-active", s.dataset.stage === "speak"));
    catCards.forEach(c => c.classList.remove("is-visible"));
    trustItems.forEach(t => t.classList.remove("is-on"));
    draftChecks.forEach(c => { c.classList.remove("is-active"); c.classList.remove("is-done"); });

    replayBtn.classList.remove("is-on");
    progressFill.classList.remove("is-paused");

    // Kick audio if user has unmuted
    if (!muted) {
      try {
        audio.currentTime = 0;
        audio.playbackRate = AUDIO_RATE;
        const playPromise = audio.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch(() => { /* autoplay blocked - silent fail */ });
        }
      } catch (e) { /* noop */ }
    }

    startedAt = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function pauseFilm(showReplay) {
    paused = true;
    cancelAnimationFrame(rafId);
    progressFill.classList.add("is-paused");
    progressFill.style.width = "100%";
    if (showReplay) {
      replayBtn.classList.add("is-on");
      // Auto-restart after 3s (only if user hasn't interacted)
      autoRestartTimer = setTimeout(() => {
        if (paused) startFilm();
      }, 3000);
    }
    try { audio.pause(); } catch (e) {}
  }

  let autoRestartTimer = null;

  // ─── MUTE TOGGLE ───────────────────────────────────────────────────────
  // SVG icons for muted / unmuted states
  const ICON_MUTED = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 6h2.2L8.5 3.4v9.2L5.2 10H3V6z" fill="currentColor"/><path d="M11 6.2l3 3.6M14 6.2l-3 3.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  const ICON_LIVE  = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 6h2.2L8.5 3.4v9.2L5.2 10H3V6z" fill="currentColor"/><path d="M11 5.5c1 .8 1.4 1.6 1.4 2.5s-.4 1.7-1.4 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13 3.5c2 1.4 2.8 2.8 2.8 4.5s-.8 3.1-2.8 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

  function setMuted(m) {
    muted = m;
    audio.muted = m;
    muteBtn.setAttribute("aria-pressed", String(!m));
    if (m) {
      muteIcon.innerHTML = ICON_MUTED;
      muteLabel.textContent = "Hear it";
      muteBtn.classList.remove("is-on");
    } else {
      muteIcon.innerHTML = ICON_LIVE;
      muteLabel.textContent = "Mute";
      muteBtn.classList.add("is-on");
      // Try to start audio in sync with current film time
      try {
        const elapsed = performance.now() - startedAt;
        if (elapsed >= SPEAK_START && elapsed < ST.SPEAK_END) {
          audio.currentTime = ((elapsed - SPEAK_START) / 1000) * AUDIO_RATE;
          audio.playbackRate = AUDIO_RATE;
          audio.play().catch(() => {});
        }
      } catch (e) {}
    }
  }

  muteBtn.addEventListener("click", () => setMuted(!muted));

  // Default muted (autoplay-friendly)
  audio.muted = true;

  // ─── REPLAY BUTTON ─────────────────────────────────────────────────────
  replayBtn.addEventListener("click", () => {
    clearTimeout(autoRestartTimer);
    startFilm();
  });

  // ─── PAUSE WHEN OFF-SCREEN (perf) ──────────────────────────────────────
  let wasVisible = true;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !wasVisible) {
        wasVisible = true;
        if (!paused) {
          startedAt = performance.now() - 0; // restart cleanly
          rafId = requestAnimationFrame(tick);
        }
      } else if (!e.isIntersecting && wasVisible) {
        wasVisible = false;
        cancelAnimationFrame(rafId);
        try { audio.pause(); } catch (e2) {}
      }
    });
  }, { threshold: 0.1 });
  obs.observe(stageEl);

  // ─── KICK OFF ──────────────────────────────────────────────────────────
  // Wait a beat for paint, then start.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startFilm);
  } else {
    startFilm();
  }

  // Pause on tab hidden (battery friendly)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      try { audio.pause(); } catch (e) {}
    } else if (!paused) {
      startedAt = performance.now() - (performance.now() - startedAt);
      rafId = requestAnimationFrame(tick);
    }
  });

})();
