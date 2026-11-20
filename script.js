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
    var links = document.querySelector(".nav-links");
    if (links) links.appendChild(group);
    else document.body.appendChild(group);
    window.interviewCoachPlaceTheme = placeThemeSwitch;
  }

  function placeThemeSwitch(view) {
    var sw = document.querySelector(".theme-switch");
    var links = document.querySelector(".nav-links");
    if (!sw) return;
    if (view === "room") {
      document.body.appendChild(sw);
      return;
    }
    if (links) links.appendChild(sw);
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

  function isTipHiddenForToday() {
    try {
      return localStorage.getItem(TIP_DAY) === todayStamp();
    } catch (error) {
      return false;
    }
  }

  var tipCard = document.getElementById("tip-card");
  var tipText = document.getElementById("tip-text");
  var tipReady = false;

  function syncTipForView(view) {
    if (!tipCard || !tipText) return;
    if (isTipHiddenForToday()) {
      tipCard.hidden = true;
      return;
    }
    if (view === "home") {
      if (!tipReady) {
        tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
        tipReady = true;
      }
      tipCard.hidden = false;
      return;
    }
    tipCard.hidden = true;
  }

  if (tipCard && tipText) {
    tipCard.hidden = true;
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
    window.interviewCoachSyncTip = syncTipForView;
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
