(function () {
  "use strict";

  var HISTORY_KEY = "interview-coach.history.v1";
  var ACTIVE_KEY = "interview-coach.active.v1";
  var CIRC = 2 * Math.PI * 52;

  var state = {
    view: "home",
    config: null,
    queue: [],
    index: 0,
    turns: [],
    followUpsUsed: 0,
    speechMs: 0,
    speechStamp: null,
    listening: false,
    recognition: null,
    raf: 0,
    timerEndsAt: null,
    timeUp: false,
    remainingMs: null,
    questionStartedAtWall: null,
    draft: "",
    lastSession: null,
  };

  var toastId = 0;
  var saveTimer = 0;
  var lockUntil = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function scoreClass(score) {
    if (score == null) return "";
    if (score >= 85) return "score-high";
    if (score >= 72) return "score-mid";
    if (score >= 60) return "score-low";
    return "score-poor";
  }

  function toast(message) {
    var el = $("toast");
    el.textContent = message;
    el.classList.add("is-on");
    var id = ++toastId;
    setTimeout(function () {
      if (id === toastId) el.classList.remove("is-on");
    }, 3200);
  }

  function loadHistory() {
    try {
      var raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      return [];
    }
  }

  function writeHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 30)));
    } catch (error) {
      toast("기록을 저장할 공간이 부족합니다.");
    }
  }

  function loadActive() {
    try {
      var raw = JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || "null");
      if (!raw || !raw.config || !Array.isArray(raw.queue)) return null;
      return raw;
    } catch (error) {
      return null;
    }
  }

  function clearActive() {
    sessionStorage.removeItem(ACTIVE_KEY);
  }

  function saveActive() {
    if (!state.config || !state.queue.length) return;
    var data = {
      config: state.config,
      queue: state.queue,
      index: state.index,
      turns: state.turns,
      followUpsUsed: state.followUpsUsed,
      speechMs: state.speechMs,
      timeUp: state.timeUp,
      remainingMs: state.timerEndsAt ? Math.max(0, state.timerEndsAt - Date.now()) : state.remainingMs,
      questionStartedAtWall: state.questionStartedAtWall,
      draft: $("transcript") ? $("transcript").value : state.draft,
    };
    try {
      sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(data));
    } catch (error) {
      /* keep the interview running even if storage is full */
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (state.view === "room") saveActive();
    }, 400);
  }

  function selected(group) {
    var el = document.querySelector('[data-group="' + group + '"][aria-pressed="true"]');
    return el ? el.dataset.value : null;
  }

  function clearGroup(group) {
    document.querySelectorAll('[data-group="' + group + '"]').forEach(function (btn) {
      btn.setAttribute("aria-pressed", "false");
    });
  }

  function selectGroup(group, value) {
    var found = false;
    document.querySelectorAll('[data-group="' + group + '"]').forEach(function (btn) {
      var on = btn.dataset.value === String(value);
      if (on) found = true;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (group === "major" && found) $("custom-major").value = "";
    updateSummary();
    return found;
  }

  function readSetup() {
    var purpose = selected("purpose");
    var difficulty = selected("difficulty") || "intermediate";
    var timeLimit = Number(selected("time") || 0);
    var count = Number(selected("count") || 3);
    var custom = $("custom-major").value.trim().slice(0, 40);
    var majorBtn = selected("major");
    var majorId = majorBtn;
    var majorKo = "";
    var majorEn = "";
    var known = null;
    if (custom) {
      known = InterviewData.meta.majors.find(function (major) {
        return major.ko === custom || major.en.toLowerCase() === custom.toLowerCase();
      });
      if (known && known.id !== "undecided") {
        majorId = known.id;
        majorKo = known.ko;
        majorEn = known.en;
      } else {
        majorId = "custom";
        majorKo = custom;
        majorEn = custom;
      }
    } else if (majorBtn) {
      known = InterviewData.meta.majors.find(function (major) { return major.id === majorBtn; });
      majorKo = known ? known.ko : majorBtn;
      majorEn = known ? known.en : "your field";
    }
    var purposeMeta = InterviewData.meta.purposes.find(function (item) { return item.id === purpose; });
    var diffMeta = InterviewData.meta.difficulties.find(function (item) { return item.id === difficulty; });
    return {
      purpose: purpose,
      purposeLabel: purposeMeta ? purposeMeta.ko : "",
      majorId: majorId,
      majorKo: majorKo,
      majorEn: majorEn || "your field",
      difficulty: difficulty,
      difficultyLabel: diffMeta ? diffMeta.ko : "",
      timeLimit: timeLimit,
      count: count,
      requestedCount: count,
    };
  }

  function updateSummary() {
    var config = readSetup();
    var el = $("setup-summary");
    if (!config.purpose || !config.majorKo) {
      el.textContent = "목적과 전공을 고르면 면접이 만들어집니다.";
      return;
    }
    var time = config.timeLimit ? "문항당 " + config.timeLimit + "초" : "시간 제한 없음";
    el.textContent = config.purposeLabel + " · " + config.majorKo + " · " + config.difficultyLabel + " · " + time + " · " + config.count + "문항";
  }

  function showView(name) {
    state.view = name;
    document.body.classList.toggle("is-room", name === "room");
    ["home", "setup", "room", "report", "history"].forEach(function (id) {
      $("view-" + id).hidden = id !== name;
    });
    var titles = {
      home: "Interview Coach",
      setup: "면접 설정 · Interview Coach",
      room: "모의 면접 · Interview Coach",
      report: "리포트 · Interview Coach",
      history: "연습 기록 · Interview Coach",
    };
    document.title = titles[name] || "Interview Coach";
    var historyBtn = document.querySelector('[data-nav="history"]');
    if (historyBtn) {
      if (name === "history") historyBtn.setAttribute("aria-current", "page");
      else historyBtn.removeAttribute("aria-current");
    }
    window.scrollTo(0, 0);
  }

  function renderResume() {
    var data = loadActive();
    var card = $("resume-card");
    if (!data) {
      card.hidden = true;
      return;
    }
    var done = (data.turns || []).length;
    var total = (data.queue || []).filter(function (item) { return item.kind !== "followup"; }).length;
    $("resume-text").textContent = data.config.purposeLabel + " · " + data.config.majorKo + " · " + data.config.difficultyLabel + " · " + done + "/" + total + " 답변";
    card.hidden = false;
  }

  function cleanupRuntime() {
    stopMic();
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.timerEndsAt = null;
  }

  function paintTimer(leftMs) {
    var total = state.config.timeLimit * 1000;
    var ratio = total ? leftMs / total : 0;
    var ring = $("ring-fg");
    ring.style.strokeDasharray = String(CIRC);
    ring.style.strokeDashoffset = String(CIRC * (1 - ratio));
    var sec = Math.ceil(leftMs / 1000);
    var minutes = Math.floor(sec / 60);
    var seconds = sec % 60;
    $("timer-num").textContent = minutes + ":" + String(seconds).padStart(2, "0");
    $("timer-wrap").classList.toggle("is-urgent", sec <= 10 && leftMs > 0);
    $("timer-wrap").classList.remove("is-off");
    $("timer-cap").textContent = leftMs <= 0 ? "종료" : "남음";
  }

  function showOpenTimer() {
    $("timer-wrap").classList.add("is-off");
    $("timer-wrap").classList.remove("is-urgent");
    $("timer-cap").textContent = "시간 제한 없음";
    $("timeup-note").hidden = true;
  }

  function startTimer(endsAt) {
    state.timerEndsAt = endsAt;
    state.timeUp = false;
    $("timeup-note").hidden = true;
    var tick = function () {
      var left = Math.max(0, state.timerEndsAt - Date.now());
      state.remainingMs = left;
      paintTimer(left);
      if (left <= 0) {
        state.raf = 0;
        onTimeUp();
        return;
      }
      state.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  function onTimeUp() {
    state.timeUp = true;
    state.remainingMs = 0;
    state.timerEndsAt = null;
    stopMic();
    paintTimer(0);
    $("timeup-note").hidden = false;
    $("btn-mic").disabled = true;
    saveActive();
  }

  function updateWordCount() {
    var text = $("transcript").value;
    var count = InterviewEngine.countEnglishWords(text);
    var hangul = /[가-힣]/.test(text);
    var el = $("word-count");
    var cut = state.config ? InterviewEngine.thinThreshold(state.config.difficulty) : 18;
    if (hangul && count === 0) {
      el.textContent = "영어 문장으로 말해 보세요";
      el.classList.add("is-short");
    } else {
      el.textContent = count + " words";
      el.classList.toggle("is-short", count > 0 && count < cut);
    }
    state.draft = text;
  }

  function renderRoom(question) {
    var mains = state.queue.filter(function (item) { return item.kind === "main"; });
    var currentMain = question.kind === "followup" ? question.parentMain : question.mainNumber;
    $("room-meta").textContent = state.config.purposeLabel + " · " + state.config.majorKo + " · " + state.config.difficultyLabel;
    $("room-progress").textContent = question.kind === "followup"
      ? "질문 " + currentMain + "의 꼬리 질문"
      : "질문 " + question.mainNumber + " / " + mains.length;
    $("room-dots").innerHTML = mains.map(function (item) {
      var done = state.turns.some(function (turn) { return turn.question.id === item.id; });
      var current = item.mainNumber === currentMain;
      return '<span class="dot' + (done ? " is-done" : "") + (current ? " is-current" : "") + '"></span>';
    }).join("");
    $("room-question").textContent = question.text;
    $("room-focus").textContent = "의도 · " + question.focus;
    $("btn-listen").textContent = "질문 듣기";
    $("btn-mic").disabled = !state.recognition || state.timeUp;
    $("interim-line").textContent = "";
  }

  function showQuestion(options) {
    cleanupRuntime();
    var question = state.queue[state.index];
    if (!options.restore) {
      state.speechMs = 0;
      state.speechStamp = null;
      state.timeUp = false;
      state.draft = "";
      state.questionStartedAtWall = Date.now();
      state.remainingMs = state.config.timeLimit ? state.config.timeLimit * 1000 : null;
      $("transcript").value = "";
    } else {
      $("transcript").value = state.draft || "";
      if (state.remainingMs === 0) state.timeUp = true;
    }
    renderRoom(question);
    showView("room");
    updateWordCount();
    if (state.config.timeLimit && !state.timeUp) {
      startTimer(Date.now() + (state.remainingMs == null ? state.config.timeLimit * 1000 : state.remainingMs));
    } else if (state.timeUp) {
      paintTimer(0);
      $("timeup-note").hidden = false;
      $("btn-mic").disabled = true;
    } else {
      showOpenTimer();
    }
    saveActive();
    if (options.speak) speakText(question.text);
  }

  function beginInterview() {
    var draft = readSetup();
    if (!draft.purpose) return toast("면접 목적을 선택하세요.");
    if (!draft.majorKo) return toast("전공 또는 직무를 선택하세요.");
    if (loadActive()) {
      var replaceOk = confirm("진행 중인 면접 대신 새 면접을 시작할까요?");
      if (!replaceOk) return;
    }
    var queue = InterviewEngine.pickQuestions(draft, InterviewData.bank);
    if (!queue.length) return toast("해당 조건의 질문을 찾지 못했습니다.");
    state.config = draft;
    state.config.count = queue.length;
    state.queue = queue;
    state.index = 0;
    state.turns = [];
    state.followUpsUsed = 0;
    state.lastSession = null;
    clearActive();
    showQuestion({ restore: false, speak: true });
  }

  function finishInterview() {
    cleanupRuntime();
    if (!state.turns.length || !state.config) {
      clearActive();
      toast("저장할 답변이 없습니다.");
      showView("home");
      return;
    }
    var session = InterviewEngine.buildSession(state.config, state.turns);
    var history = loadHistory().filter(function (item) { return item.id !== session.id; });
    history.unshift(session);
    writeHistory(history);
    clearActive();
    state.config = null;
    state.queue = [];
    state.turns = [];
    renderResume();
    openReport(session);
  }

  function submitAnswer() {
    if (Date.now() < lockUntil) return;
    var answer = $("transcript").value.trim();
    var words = InterviewEngine.countEnglishWords(answer);
    var hangul = /[가-힣]/.test(answer);
    if (!answer || (words === 0 && !hangul)) {
      $("transcript").classList.add("is-invalid");
      toast("영어 또는 한글로 답변을 입력한 뒤 제출하세요.");
      return;
    }
    lockUntil = Date.now() + 500;
    stopMic();
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    var question = state.queue[state.index];
    var analysis = InterviewEngine.analyze({
      answer: answer,
      question: question,
      difficulty: state.config.difficulty,
      speechMs: state.speechMs,
    });
    state.turns.push({
      question: question,
      answer: answer,
      analysis: analysis,
      responseSec: Math.max(1, Math.round((Date.now() - state.questionStartedAtWall) / 1000)),
      speechMs: state.speechMs,
    });
    var follow = InterviewEngine.createFollowUp(question, analysis, state.config.difficulty, state.followUpsUsed);
    if (follow) {
      state.followUpsUsed += 1;
      state.queue.splice(state.index + 1, 0, follow);
    }
    state.index += 1;
    if (state.index >= state.queue.length) finishInterview();
    else showQuestion({ restore: false, speak: true });
  }

  function resumeInterview() {
    var data = loadActive();
    if (!data) return toast("이어할 면접이 없습니다.");
    state.config = data.config;
    state.queue = data.queue;
    state.index = data.index || 0;
    state.turns = data.turns || [];
    state.followUpsUsed = data.followUpsUsed || 0;
    state.speechMs = data.speechMs || 0;
    state.timeUp = !!data.timeUp;
    state.remainingMs = data.remainingMs;
    state.questionStartedAtWall = data.questionStartedAtWall || Date.now();
    state.draft = data.draft || "";
    if (state.index >= state.queue.length) {
      finishInterview();
      return;
    }
    showQuestion({ restore: true, speak: true });
  }

  function discardActive() {
    if (!confirm("진행 중인 면접을 버릴까요?")) return;
    clearActive();
    state.config = null;
    state.queue = [];
    state.turns = [];
    renderResume();
  }

  function goTo(view) {
    if (state.view === "room" && view !== "room") {
      var leaveOk = confirm("면접을 잠시 나갈까요? 진행 상황은 이 브라우저에 저장됩니다.");
      if (!leaveOk) return;
      saveActive();
      cleanupRuntime();
    }
    if (view === "home") {
      renderResume();
      showView("home");
      return;
    }
    if (view === "history") {
      renderHistory();
      showView("history");
      return;
    }
    if (view === "setup") {
      updateSummary();
      showView("setup");
      return;
    }
    showView(view);
  }

  function speakText(text) {
    if (!window.speechSynthesis || !text) {
      toast("이 브라우저는 음성 읽기를 지원하지 않습니다.");
      return;
    }
    speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    var difficulty = state.config && state.config.difficulty;
    utter.rate = difficulty === "beginner" ? 0.92 : difficulty === "advanced" ? 1.02 : 0.98;
    var voices = speechSynthesis.getVoices();
    var voice = voices.find(function (item) {
      return /^en/i.test(item.lang) && /natural|google|samantha|aria|jenny/i.test(item.name);
    }) || voices.find(function (item) { return /^en/i.test(item.lang); });
    if (voice) utter.voice = voice;
    utter.onstart = function () {
      if (state.view === "room") $("btn-listen").textContent = "멈추기";
    };
    utter.onend = function () {
      if ($("btn-listen")) $("btn-listen").textContent = "질문 듣기";
    };
    speechSynthesis.speak(utter);
  }

  function speakCurrentQuestion() {
    if (window.speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.cancel();
      $("btn-listen").textContent = "질문 듣기";
      return;
    }
    var question = state.queue[state.index];
    if (question) speakText(question.text);
  }

  function speakModel(index) {
    var session = state.lastSession;
    if (!session || !session.turns[index]) return;
    speakText(session.turns[index].model);
  }

  function setMicUi(on) {
    var btn = $("btn-mic");
    if (!btn) return;
    btn.classList.toggle("is-listening", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "녹음 멈추기" : "답변 녹음 시작");
    var label = btn.querySelector("span");
    if (label) label.textContent = on ? "멈추기" : "말하기";
  }

  function startMic() {
    if (window.speechSynthesis) speechSynthesis.cancel();
    $("btn-listen").textContent = "질문 듣기";
    state.listening = true;
    setMicUi(true);
    $("interim-line").textContent = "듣고 있습니다…";
    try { state.recognition.start(); } catch (error) { /* already started */ }
  }

  function stopMic() {
    state.listening = false;
    if (state.speechStamp) {
      state.speechMs += performance.now() - state.speechStamp;
      state.speechStamp = null;
    }
    if (state.recognition) {
      try { state.recognition.stop(); } catch (error) { /* not started */ }
    }
    setMicUi(false);
    if ($("interim-line") && state.view === "room") $("interim-line").textContent = "";
  }

  function toggleMic() {
    if (!state.recognition) {
      toast("이 브라우저는 음성 인식을 지원하지 않습니다. 텍스트로 답해 주세요.");
      return;
    }
    if (state.timeUp) {
      toast("제한 시간이 끝나 마이크는 멈췄습니다. 문장은 고칠 수 있습니다.");
      return;
    }
    if (state.listening) stopMic();
    else startMic();
  }

  function setupRecognition() {
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      state.recognition = null;
      $("btn-mic").disabled = true;
      $("mic-note").hidden = false;
      return;
    }
    var rec;
    try {
      rec = new Ctor();
    } catch (error) {
      state.recognition = null;
      $("btn-mic").disabled = true;
      $("mic-note").hidden = false;
      return;
    }
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = function (event) {
      if (!state.speechStamp) state.speechStamp = performance.now();
      var interim = "";
      var finalText = "";
      for (var i = event.resultIndex; i < event.results.length; i += 1) {
        var chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      if (finalText) {
        var box = $("transcript");
        var needsSpace = box.value && !/\s$/.test(box.value);
        box.value += (needsSpace ? " " : "") + finalText.trim();
        if (box.value.length > 2500) box.value = box.value.slice(0, 2500);
        updateWordCount();
        scheduleSave();
      }
      $("interim-line").textContent = interim || "듣고 있습니다…";
    };
    rec.onerror = function (event) {
      if (event.error === "no-speech" || event.error === "aborted") return;
      state.listening = false;
      setMicUi(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        toast("마이크 권한이 없습니다. 텍스트로 이어서 연습할 수 있습니다.");
      }
    };
    rec.onend = function () {
      if (state.speechStamp) {
        state.speechMs += performance.now() - state.speechStamp;
        state.speechStamp = null;
      }
      if (state.listening && !state.timeUp) {
        try { rec.start(); } catch (error) { /* restart race */ }
      } else {
        setMicUi(false);
      }
    };
    state.recognition = rec;
    $("btn-mic").disabled = false;
  }

  function formatWhen(iso) {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function dimensionLabel(id) {
    var found = InterviewEngine.DIMENSIONS.find(function (item) { return item.id === id; });
    return found ? found.label : id;
  }

  function compareLine(session) {
    var all = loadHistory();
    var idx = all.findIndex(function (item) { return item.id === session.id; });
    if (idx < 0 || !all[idx + 1]) return "";
    return "이전 " + all[idx + 1].overall + "점 → 이번 " + session.overall + "점";
  }

  function dictWordHtml(word, extraClass) {
    var shown = String(word || "").trim();
    if (/\s/.test(shown)) {
      return shown.split(/(\s+)/).map(function (part) {
        if (/^\s+$/.test(part)) return escapeHtml(part);
        return dictWordHtml(part, extraClass);
      }).join("");
    }
    var key = shown.toLowerCase().replace(/[^a-z'-]/g, "");
    if (key.length < 2) return escapeHtml(shown);
    var classes = extraClass ? "dict-word " + extraClass : "dict-word";
    return '<button type="button" class="' + classes + '" data-dict="' + escapeHtml(key) + '">' + escapeHtml(shown) + "</button>";
  }

  function linkEnglishWords(text) {
    return String(text || "").split(/(\s+)/).map(function (part) {
      if (!part || /^\s+$/.test(part)) return escapeHtml(part);
      var match = part.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'-]*)([^A-Za-z]*)$/);
      if (!match) return escapeHtml(part);
      return escapeHtml(match[1]) + dictWordHtml(match[2]) + escapeHtml(match[3]);
    }).join("");
  }

  var dictCache = {};
  var dictLastFocus = null;

  function closeDictionary() {
    var modal = $("dict-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (dictLastFocus && dictLastFocus.focus) dictLastFocus.focus();
  }

  function renderDictionary(entry) {
    $("dict-title").textContent = entry.word;
    $("dict-phonetic").textContent = entry.phonetic || "";
    var html = (entry.meanings || []).map(function (meaning) {
      var defs = (meaning.definitions || []).map(function (item) {
        var example = item.example
          ? '<p class="dict-example" lang="en">“' + escapeHtml(item.example) + "”</p>"
          : "";
        return "<p lang=\"en\">" + escapeHtml(item.definition) + "</p>" + example;
      }).join("");
      return '<section class="dict-sense"><p class="dict-pos">' + escapeHtml(meaning.partOfSpeech || "meaning") + "</p>" + defs + "</section>";
    }).join("");
    $("dict-body").innerHTML = html || "<p>등록된 뜻풀이가 없습니다.</p>";
  }

  function openDictionary(raw, trigger) {
    var word = String(raw || "").toLowerCase().replace(/[^a-z'-]/g, "");
    var modal = $("dict-modal");
    if (!modal || word.length < 2) return;
    dictLastFocus = trigger || document.activeElement;
    modal.hidden = false;
    $("dict-title").textContent = word;
    $("dict-phonetic").textContent = "";
    $("dict-body").innerHTML = "<p>사전을 찾고 있습니다…</p>";
    $("dict-close").focus();
    if (dictCache[word]) {
      renderDictionary(dictCache[word]);
      return;
    }
    fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word))
      .then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(function (data) {
        var first = data && data[0];
        if (!first) throw new Error("empty");
        var entry = {
          word: first.word || word,
          phonetic: first.phonetic || (first.phonetics && first.phonetics[0] && first.phonetics[0].text) || "",
          meanings: (first.meanings || []).slice(0, 2).map(function (meaning) {
            return {
              partOfSpeech: meaning.partOfSpeech,
              definitions: (meaning.definitions || []).slice(0, 2).map(function (item) {
                return { definition: item.definition, example: item.example || "" };
              })
            };
          })
        };
        dictCache[word] = entry;
        if ($("dict-title").textContent === word || $("dict-title").textContent === entry.word) renderDictionary(entry);
      })
      .catch(function () {
        if ($("dict-title").textContent !== word) return;
        $("dict-body").innerHTML = "<p>이 단어의 영영 풀이를 찾지 못했습니다.</p>";
      });
  }

  function reportHtml(session) {
    var same = session.strongest && session.strongest === session.weakest;
    var lead = same
      ? "다섯 축이 비슷합니다. 아래 문항에서 한 가지씩만 고쳐 보세요."
      : "강한 축은 " + dimensionLabel(session.strongest) + ", 먼저 손볼 축은 " + dimensionLabel(session.weakest) + "입니다.";
    var range = InterviewEngine.paceTarget(session.config.difficulty);
    var meters = InterviewEngine.DIMENSIONS.map(function (dimension) {
      var value = session.dimensions[dimension.id];
      var width = value == null ? 0 : value;
      var note = dimension.id === "pace"
        ? (session.paceMeasured ? "권장 " + range[0] + "–" + range[1] + " WPM" : "마이크 답변이 없어 속도는 계산하지 않았습니다")
        : "";
      return '<div class="meter ' + scoreClass(value) + '"><div class="meter-top"><span>' + dimension.label + '</span><span>' +
        (value == null ? "—" : value) + '</span></div><div class="meter-track"><div class="meter-fill" style="width:' +
        width + '%"></div></div>' + (note ? '<p class="meta-line">' + note + "</p>" : "") + "</div>";
    }).join("");
    var fillerNote = session.fillers && session.fillers.length
      ? '<p class="meta-line">군더더기 ' + session.fillers.map(function (item) {
        return escapeHtml(item.label) + " " + item.count + "회";
      }).join(", ") + "</p>"
      : "";
    var cards = session.turns.map(function (turn, index) {
      var label = turn.kind === "followup" ? "꼬리 질문" : "질문 " + turn.mainNumber;
      var paceBit = turn.wpm ? turn.wpm + " WPM" : "속도 미측정";
      var comments = (turn.comments || []).map(function (comment) {
        return "<li>" + escapeHtml(comment) + "</li>";
      }).join("");
      var grammar = turn.grammar.length
        ? turn.grammar.map(function (item) {
          return "<li><strong>" + escapeHtml(item.excerpt) + "</strong> → " + escapeHtml(item.fix) + ". " + escapeHtml(item.explain) + "</li>";
        }).join("")
        : "<li>뚜렷한 문법 패턴은 보이지 않습니다.</li>";
      var vocab = turn.vocabulary.length
        ? turn.vocabulary.map(function (item) {
          var suggestions = (item.to || []).map(dictWordHtml).join(" / ");
          return "<li>" + dictWordHtml(item.from) + " → " + suggestions + "</li>";
        }).join("")
        : "<li>당장 바꿀 기초 표현은 없습니다.</li>";
      var checks = turn.structure.parts.map(function (part) {
        return '<li class="check' + (part.hit ? " on" : "") + '">' + escapeHtml(part.label) + "</li>";
      }).join("");
      var keys = turn.keywordsHit.length
        ? turn.keywordsHit.map(function (word) { return dictWordHtml(word, "kw"); }).join(" ")
        : '<span class="kw">핵심 단어가 거의 없습니다</span>';
      return '<article class="q-card"><header class="q-card-head"><div><p class="eyebrow">' + label +
        "</p><h3 lang=\"en\">" + escapeHtml(turn.prompt) + '</h3></div><p class="q-score ' + scoreClass(turn.scores.overall) +
        '">' + turn.scores.overall + '</p></header><p class="meta-line">의도 · ' + escapeHtml(turn.focus) + " · " +
        turn.wordCount + " words · 응답 " + turn.responseSec + "초 · " + paceBit + "</p>" +
        (comments ? '<ul class="comment-list">' + comments + "</ul>" : "") +
        '<p class="answer-block" lang="en">' + linkEnglishWords(turn.answer) + "</p>" +
        "<h4>문법</h4><ul class=\"issue-list\">" + grammar + "</ul>" +
        "<h4>어휘</h4><ul class=\"issue-list\">" + vocab + "</ul>" +
        "<h4>" + (turn.structure.mode === "star" ? "STAR 구조" : "주장 · 이유 · 예시") + "</h4><ul class=\"check-list\">" + checks + "</ul>" +
        "<h4>맞춘 포인트</h4><p>" + keys + "</p>" +
        '<details><summary>모범 답안</summary><p class="model-block" lang="en">' + linkEnglishWords(turn.model) +
        '</p><button class="btn ghost small" type="button" data-action="speak-model" data-index="' + index +
        '">모범 답안 듣기</button></details></article>';
    }).join("");
    var delta = compareLine(session);
    return '<p class="kicker">Report</p><h1 class="page-title">' + escapeHtml(session.config.purposeLabel) + " · " +
      escapeHtml(session.config.majorKo) + "</h1><div class=\"report-hero\"><p class=\"score-xl " + scoreClass(session.overall) +
      '">' + session.overall + '</p><div><p class="band">' + escapeHtml(InterviewEngine.bandLabel(session.overall)) +
      "</p><p>" + escapeHtml(lead) + "</p>" + (delta ? '<p class="compare">' + escapeHtml(delta) + "</p>" : "") +
      '<p class="meta-line">' + escapeHtml(session.config.difficultyLabel) + " · " + formatWhen(session.createdAt) +
      " · " + session.turns.length + "개 답변</p></div></div><div class=\"meters\">" + meters + "</div>" + fillerNote +
      '<p class="fineprint">종합 점수는 문법, 어휘, 속도, 구조, 적합성을 함께 본 값입니다. 속도는 마이크를 사용한 답변만 반영합니다. 영어 단어나 추천 표현을 누르면 영영 사전을 봅니다.</p>' +
      '<section class="panel ai-coach" data-ai-coach><p class="kicker">AI Coach</p><p>코치 의견을 불러오는 중입니다.</p></section>' +
      '<div class="q-list">' + cards + '</div><div class="report-actions" style="margin-top:18px"><button class="btn ghost" type="button" data-action="goto" data-view="history">연습 기록</button><button class="btn primary" type="button" data-action="practice-again">이 설정으로 다시</button></div>';
  }

  function aiCoachHtml(data) {
    var turns = (data.turns || []).map(function (turn, index) {
      var rewrite = turn.rewrite
        ? '<p class="model-block" lang="en">' + linkEnglishWords(turn.rewrite) + "</p>"
        : "";
      return '<article class="ai-turn"><h3>질문 ' + (index + 1) + "</h3><p>" + escapeHtml(turn.note || "") + "</p>" + rewrite + "</article>";
    }).join("");
    var via = data.provider === "groq" ? "Groq" : "Gemini";
    return '<p class="kicker">AI Coach</p><h2>이번 답에 대한 코치</h2><p class="ai-summary">' +
      escapeHtml(data.summary || "") + "</p>" + turns +
      '<p class="meta-line">' + via + "로 작성했습니다.</p>";
  }

  function rememberAiCoach(session, data) {
    session.aiCoach = data;
    var history = loadHistory();
    var index = history.findIndex(function (item) { return item.id === session.id; });
    if (index >= 0) {
      history[index].aiCoach = data;
      writeHistory(history);
    }
  }

  function requestAiCoach(session) {
    var box = document.querySelector("[data-ai-coach]");
    if (!box) return;
    if (session.aiCoach) {
      box.innerHTML = aiCoachHtml(session.aiCoach);
      return;
    }
    var payload = {
      purpose: session.config.purposeLabel,
      major: session.config.majorKo,
      difficulty: session.config.difficultyLabel,
      turns: (session.turns || []).map(function (turn) {
        return {
          prompt: String(turn.prompt || "").slice(0, 500),
          answer: String(turn.answer || "").slice(0, 1200)
        };
      })
    };
    fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    }).then(function (data) {
      if (!data || !data.summary) throw new Error("empty");
      rememberAiCoach(session, data);
      var current = document.querySelector("[data-ai-coach]");
      if (current && state.lastSession && state.lastSession.id === session.id) current.innerHTML = aiCoachHtml(data);
    }).catch(function () {
      var current = document.querySelector("[data-ai-coach]");
      if (!current) return;
      current.innerHTML = '<p class="kicker">AI Coach</p><p>AI 코치를 불러오지 못했습니다. 페이지를 로컬 서버 주소로 열었는지 확인해 주세요.</p>';
    });
  }

  function openReport(session) {
    state.lastSession = session;
    $("report-root").innerHTML = reportHtml(session);
    showView("report");
    requestAiCoach(session);
  }

  function practiceAgain() {
    var config = state.lastSession && state.lastSession.config;
    if (!config) {
      showView("setup");
      return;
    }
    selectGroup("purpose", config.purpose);
    selectGroup("difficulty", config.difficulty);
    selectGroup("time", String(config.timeLimit));
    selectGroup("count", String(config.requestedCount >= 5 ? 5 : 3));
    if (config.majorId === "custom") {
      clearGroup("major");
      $("custom-major").value = config.majorKo;
    } else {
      $("custom-major").value = "";
      selectGroup("major", config.majorId);
    }
    updateSummary();
    showView("setup");
  }

  function growthText(sessions) {
    if (sessions.length < 2) return "첫 기록이 저장되었습니다. 한 번 더 연습하면 추이가 보입니다.";
    function avg(list) {
      return Math.round(list.reduce(function (sum, item) { return sum + item.overall; }, 0) / list.length);
    }
    if (sessions.length >= 4) {
      var recent = avg(sessions.slice(0, 3));
      var prior = avg(sessions.slice(3, 6));
      var delta = recent - prior;
      var sign = delta > 0 ? "+" : "";
      return "최근 3회 평균 " + recent + "점, 그 이전 평균 " + prior + "점 (" + sign + delta + ").";
    }
    return "최근 점수 " + sessions[0].overall + "점, 바로 이전 " + sessions[1].overall + "점.";
  }

  function chartSvg(sessions) {
    var chrono = sessions.slice().reverse();
    if (!chrono.length) return "";
    var w = 560;
    var h = 180;
    var pad = 18;
    var coords = chrono.map(function (session, index) {
      var x = chrono.length === 1 ? w / 2 : pad + (index * (w - pad * 2)) / (chrono.length - 1);
      var y = pad + (1 - session.overall / 100) * (h - pad * 2);
      return [x, y, session.overall];
    });
    var line = coords.map(function (point, index) {
      return (index ? "L" : "M") + point[0].toFixed(1) + " " + point[1].toFixed(1);
    }).join(" ");
    var area = line + " L" + coords[coords.length - 1][0].toFixed(1) + " " + (h - pad) + " L" + coords[0][0].toFixed(1) + " " + (h - pad) + " Z";
    var dots = coords.map(function (point) {
      return '<circle class="point" cx="' + point[0].toFixed(1) + '" cy="' + point[1].toFixed(1) + '" r="4"><title>' + point[2] + "점</title></circle>";
    }).join("");
    var label = chrono.map(function (session) { return session.overall; }).join(", ");
    return '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="점수 추이 ' + label + '"><path class="area" d="' + area + '"></path><path class="line" d="' + line + '"></path>' + dots + "</svg>";
  }

  function renderHistory() {
    var sessions = loadHistory();
    var root = $("history-root");
    if (!sessions.length) {
      root.innerHTML = '<p class="kicker">History</p><h1 class="page-title">아직 기록이 없습니다</h1><p class="lede">한 회를 끝내면 점수와 반복되는 약점이 여기에 쌓입니다.</p><div class="hero-actions"><button class="btn primary" type="button" data-action="goto" data-view="setup">면접 시작하기</button></div>';
      return;
    }
    var counts = {};
    sessions.slice(0, 8).forEach(function (session) {
      (session.weaknesses || []).forEach(function (id) {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    var recurring = Object.keys(counts).filter(function (id) { return counts[id] >= 2; })
      .sort(function (a, b) { return counts[b] - counts[a]; });
    var weaknessHtml = recurring.length
      ? "<p>반복되는 약점 " + recurring.map(function (id) {
        return escapeHtml(dimensionLabel(id)) + " · 최근 8회 중 " + counts[id] + "회";
      }).join(" / ") + "</p>"
      : "<p>최근 기록에서 두 번 이상 겹친 약점 축은 없습니다.</p>";
    var items = sessions.map(function (session) {
      return '<li class="session-item"><button class="session-main" type="button" data-action="open-session" data-id="' +
        escapeHtml(session.id) + '"><span class="session-score ' + scoreClass(session.overall) + '">' + session.overall +
        '</span><span><strong>' + escapeHtml(session.config.purposeLabel) + " · " + escapeHtml(session.config.majorKo) +
        "</strong><small>" + escapeHtml(session.config.difficultyLabel) + " · " + formatWhen(session.createdAt) + " · " +
        session.turns.length + '개 답변</small></span></button><button class="icon-x" type="button" data-action="delete-session" data-id="' +
        escapeHtml(session.id) + '" aria-label="' + formatWhen(session.createdAt) + ' 기록 삭제">×</button></li>';
    }).join("");
    root.innerHTML = '<p class="kicker">History</p><div class="history-tools"><h1 class="page-title">연습 기록</h1><button class="btn ghost small" type="button" data-action="clear-history">기록 전체 삭제</button></div><p class="lede">' +
      escapeHtml(growthText(sessions)) + "</p>" + weaknessHtml + chartSvg(sessions) + '<ol class="session-list">' + items + "</ol>";
  }

  function openHistorySession(id) {
    var session = loadHistory().find(function (item) { return item.id === id; });
    if (session) openReport(session);
  }

  function deleteSession(id) {
    writeHistory(loadHistory().filter(function (item) { return item.id !== id; }));
    renderHistory();
  }

  function clearHistory() {
    if (!confirm("연습 기록을 모두 삭제할까요?")) return;
    writeHistory([]);
    renderHistory();
  }

  document.body.addEventListener("click", function (event) {
    var dictBtn = event.target.closest("[data-dict]");
    if (dictBtn) {
      openDictionary(dictBtn.getAttribute("data-dict"), dictBtn);
      return;
    }
    if (event.target.closest("#dict-close") || event.target.id === "dict-modal") {
      closeDictionary();
      return;
    }
    var el = event.target.closest("[data-action]");
    if (!el) return;
    var action = el.dataset.action;
    if (action === "select") {
      selectGroup(el.dataset.group, el.dataset.value);
      return;
    }
    if (action === "goto") return goTo(el.dataset.view);
    if (action === "begin") return beginInterview();
    if (action === "submit-answer") return submitAnswer();
    if (action === "toggle-mic") return toggleMic();
    if (action === "listen") return speakCurrentQuestion();
    if (action === "resume") return resumeInterview();
    if (action === "discard") return discardActive();
    if (action === "practice-again") return practiceAgain();
    if (action === "open-session") return openHistorySession(el.dataset.id);
    if (action === "delete-session") {
      event.stopPropagation();
      return deleteSession(el.dataset.id);
    }
    if (action === "clear-history") return clearHistory();
    if (action === "speak-model") return speakModel(Number(el.dataset.index));
  });

  function init() {
    var ring = $("ring-fg");
    ring.style.strokeDasharray = String(CIRC);
    ring.style.strokeDashoffset = "0";
    setupRecognition();
    if (window.speechSynthesis) {
      speechSynthesis.onvoiceschanged = function () { speechSynthesis.getVoices(); };
    }
    $("custom-major").addEventListener("input", function () {
      if ($("custom-major").value.trim()) clearGroup("major");
      updateSummary();
    });
    $("transcript").addEventListener("input", function () {
      $("transcript").classList.remove("is-invalid");
      updateWordCount();
      scheduleSave();
    });
    $("transcript").addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        submitAnswer();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeDictionary();
        return;
      }
      if (event.code !== "Space" || state.view !== "room") return;
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT" || tag === "BUTTON") return;
      event.preventDefault();
      toggleMic();
    });
    window.addEventListener("beforeunload", function () {
      if (state.view === "room") saveActive();
    });
    updateSummary();
    renderResume();
    showView("home");
  }

  init();
})();
