(function () {
  "use strict";

  var STORAGE = "interview-coach.theme";

  function applyTheme(theme) {
    var next = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE, next);
    } catch (error) {
      /* 저장을 막아 둔 브라우저에서도 이번 화면의 선택은 유지한다. */
    }
    var buttons = document.querySelectorAll("[data-theme-choice]");
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-theme-choice") === next;
      buttons[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "dark" ? "#24272c" : "#efeae2");
  }

  function mountSwitch() {
    var group = document.createElement("div");
    group.className = "theme-switch";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "화면 모드");

    var light = document.createElement("button");
    light.type = "button";
    light.setAttribute("data-theme-choice", "light");
    light.textContent = "라이트";

    var dark = document.createElement("button");
    dark.type = "button";
    dark.setAttribute("data-theme-choice", "dark");
    dark.textContent = "다크";

    group.appendChild(light);
    group.appendChild(dark);
    group.addEventListener("click", function (event) {
      var button = event.target.closest("[data-theme-choice]");
      if (!button) return;
      applyTheme(button.getAttribute("data-theme-choice"));
    });
    document.body.appendChild(group);
  }

  var saved = "light";
  try {
    saved = localStorage.getItem(STORAGE) || "light";
  } catch (error) {
    saved = "light";
  }
  mountSwitch();
  applyTheme(saved);

  var tips = [
    "첫 문장에 결론을 말하고, 이어서 이유와 예시를 붙이세요.",
    "말이 막히면 “Let me think for a second.”라고 하고, 한 박자 쉰 뒤 구조를 잡으세요.",
    "경험 질문은 Situation, Task, Action, Result 순서로 말하면 답이 분명해집니다.",
    "어려운 단어가 떠오르지 않으면 쉬운 영어로 풀어 말하세요. 끝까지 말하는 편이 낫습니다.",
    "질문의 핵심 단어를 답 첫머리에 한 번 쓰면 초점이 흔들리지 않습니다.",
    "기간, 인원, 결과처럼 숫자를 하나 넣으면 성과가 구체적으로 들립니다.",
    "말이 빨라지면 문장 끝에서 잠시 쉬세요. 속도보다 문장을 끝내는 일이 먼저입니다.",
    "“I think”만 반복하기보다 “In my experience”처럼 근거가 있는 말로 시작하세요.",
    "꼬리 질문에는 새 이야기 대신, 방금 답에서 빠진 행동이나 결과를 보태세요.",
    "마지막은 한 문장으로 닫으세요. “So that experience taught me…”처럼요."
  ];

  var TIP_DAY = "interview-coach.tip-day";

  function todayStamp() {
    var now = new Date();
    var month = String(now.getMonth() + 1);
    var day = String(now.getDate());
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return now.getFullYear() + "-" + month + "-" + day;
  }

  function hideTipForToday(card) {
    try {
      localStorage.setItem(TIP_DAY, todayStamp());
    } catch (error) {
      /* 저장이 막혀 있어도 이번 화면에서는 카드를 닫는다. */
    }
    card.hidden = true;
  }

  var tipCard = document.getElementById("tip-card");
  var tipText = document.getElementById("tip-text");
  var savedTipDay = null;
  try {
    savedTipDay = localStorage.getItem(TIP_DAY);
  } catch (error) {
    savedTipDay = null;
  }
  if (tipCard && tipText && savedTipDay !== todayStamp()) {
    tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
    tipCard.hidden = false;
    var tipClose = document.getElementById("tip-close");
    if (tipClose) {
      tipClose.addEventListener("click", function () {
        hideTipForToday(tipCard);
      });
    }
    var tipHide = document.getElementById("tip-hide-today");
    if (tipHide) {
      tipHide.addEventListener("change", function () {
        if (tipHide.checked) hideTipForToday(tipCard);
      });
    }
  }

  var startBtn = document.getElementById("start-btn");
  var resultBox = document.getElementById("result");
  var answerBox = document.getElementById("transcript");
  if (startBtn && resultBox) {
    var SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechCtor) {
      startBtn.disabled = true;
      resultBox.textContent = "이 브라우저는 음성 인식을 지원하지 않습니다.";
    } else {
      var recognition = new SpeechCtor();
      var listening = false;
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      function setListening(on) {
        listening = on;
        startBtn.setAttribute("aria-pressed", on ? "true" : "false");
        startBtn.textContent = on ? "🎙️ 마이크 끄기" : "🎙️ 마이크 켜고 말하기";
      }

      function writeAnswer(finalText) {
        if (!answerBox || !finalText) return;
        var needsSpace = answerBox.value && !/\s$/.test(answerBox.value);
        answerBox.value += (needsSpace ? " " : "") + finalText.trim();
        if (answerBox.value.length > 2500) answerBox.value = answerBox.value.slice(0, 2500);
        answerBox.dispatchEvent(new Event("input", { bubbles: true }));
      }

      recognition.onresult = function (event) {
        var interim = "";
        var finalText = "";
        for (var i = event.resultIndex; i < event.results.length; i += 1) {
          var chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += chunk;
          else interim += chunk;
        }
        writeAnswer(finalText);
        var shown = answerBox && answerBox.value ? answerBox.value : "";
        if (interim) shown = (shown ? shown + " " : "") + interim;
        resultBox.textContent = shown || "듣고 있습니다…";
      };

      recognition.onerror = function (event) {
        if (event.error === "no-speech" || event.error === "aborted") return;
        setListening(false);
        try { recognition.stop(); } catch (error) { /* 이미 멈춘 상태 */ }
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          resultBox.textContent = "마이크 권한이 없습니다. 브라우저에서 마이크를 허용해 주세요.";
        }
      };

      recognition.onend = function () {
        if (!listening) return;
        try { recognition.start(); } catch (error) { setListening(false); }
      };

      startBtn.addEventListener("click", function () {
        if (listening) {
          setListening(false);
          try { recognition.stop(); } catch (error) { /* 이미 멈춘 상태 */ }
          return;
        }
        setListening(true);
        resultBox.textContent = "듣고 있습니다… 영어로 말해 주세요.";
        try {
          recognition.start();
        } catch (error) {
          setListening(false);
          resultBox.textContent = "마이크를 시작하지 못했습니다. 잠시 뒤 다시 눌러 주세요.";
        }
      });
    }
  }

  var headlines = [
    ["실전처럼 말하고,", "합격으로 증명하세요."],
    ["당신의 최종 합격을 완성할", "마지막 1분."],
    ["실수해도 괜찮습니다.", "여기는 합격을 위한 연습실."],
    ["말하기의 차이가", "합격의 차이를 만듭니다."],
    ["가장 떨리는 순간을,", "가장 완벽한 성공으로."],
    ["준비된 목소리로,", "당당한 합격에 도달하세요."]
  ];

  var title = document.getElementById("hero-title");
  if (!title) return;

  var pick = headlines[Math.floor(Math.random() * headlines.length)];
  var accent = document.createElement("span");
  accent.textContent = pick[1];
  title.textContent = pick[0];
  title.appendChild(document.createElement("br"));
  title.appendChild(accent);
})();
