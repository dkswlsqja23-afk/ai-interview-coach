(function () {
  "use strict";

  const DIMENSIONS = [
    { id: "grammar", label: "문법" },
    { id: "vocabulary", label: "어휘" },
    { id: "pace", label: "속도" },
    { id: "structure", label: "구조" },
    { id: "relevance", label: "적합성" },
  ];

  const BASICS = [
    { word: "a lot", to: ["a great deal", "significantly"] },
    { word: "very", to: ["particularly", "genuinely"] },
    { word: "good", to: ["strong", "useful", "clear"] },
    { word: "bad", to: ["difficult", "weak"] },
    { word: "nice", to: ["valuable", "helpful"] },
    { word: "things", to: ["parts", "factors"] },
    { word: "important", to: ["essential", "significant"] },
    { word: "problem", to: ["challenge", "issue"] },
    { word: "happy", to: ["glad", "motivated"] },
    { word: "big", to: ["major", "significant"] },
  ];

  const CONNECTORS = [
    "however",
    "therefore",
    "for example",
    "for instance",
    "in addition",
    "as a result",
    "whereas",
    "although",
    "specifically",
    "in particular",
  ];

  const PATTERNS = [
    { re: /\bi am agree\b/i, fix: "I agree", explain: "agree는 동사라서 am을 붙이지 않습니다." },
    { re: /\bdiscuss about\b/i, fix: "discuss", explain: "discuss 뒤에는 about을 쓰지 않습니다." },
    { re: /\bmore better\b/i, fix: "better", explain: "better가 이미 비교급입니다." },
    { re: /\bmore easier\b/i, fix: "easier", explain: "easier가 이미 비교급입니다." },
    { re: /\breturn back\b/i, fix: "return", explain: "return에 back이 중복됩니다." },
    { re: /\bcan able to\b/i, fix: "can", explain: "can과 able to를 같이 쓰지 않습니다." },
    { re: /\bdepend of\b/i, fix: "depend on", explain: "depend 뒤에는 on이 옵니다." },
    { re: /\bmarried with\b/i, fix: "married to", explain: "married to가 자연스럽습니다." },
    { re: /\bdespite of\b/i, fix: "despite", explain: "despite 뒤에는 of를 쓰지 않습니다." },
    { re: /\bsame with\b/i, fix: "same as", explain: "same as가 자연스럽습니다." },
    { re: /\binformations\b/i, fix: "information", explain: "information은 보통 복수로 쓰지 않습니다." },
    { re: /\badvices\b/i, fix: "advice", explain: "advice는 보통 단수 형태를 씁니다." },
    { re: /\bpersons\b/i, fix: "people", explain: "사람들을 뜻할 때는 people이 자연스럽습니다." },
    { re: /\bi very like\b/i, fix: "I really like", explain: "동사를 강조할 때는 very 대신 really를 씁니다." },
    { re: /\bdid not went\b/i, fix: "did not go", explain: "did 뒤에는 동사원형이 옵니다." },
    { re: /\bdidn't went\b/i, fix: "didn't go", explain: "didn't 뒤에는 동사원형이 옵니다." },
    { re: /\bdid went\b/i, fix: "went", explain: "did와 과거형을 같이 쓰지 않습니다." },
    { re: /\b(?:he|she|it) go\b/i, fix: "goes", explain: "3인칭 단수 현재에는 -s가 필요합니다." },
    { re: /\b(?:he|she|it) have\b/i, fix: "has", explain: "he, she, it 뒤에는 has를 씁니다." },
    { re: /\b(?:they|we) was\b/i, fix: "were", explain: "they와 we 뒤에는 were가 옵니다." },
    { re: /\bi has\b/i, fix: "I have", explain: "I 뒤에는 have를 씁니다." },
    { re: /\ba (?:apple|example|opportunity|interview|hour|idea)\b/i, fix: "an + 명사", explain: "모음 소리 앞에는 an을 씁니다." },
    { re: /\ban (?:university|user)\b/i, fix: "a university / a user", explain: "yu 소리로 시작하면 a를 씁니다." },
    { re: /\bexplain me\b/i, fix: "explain to me", explain: "explain 뒤에는 to me가 자연스럽습니다." },
    { re: /\blook forward to see\b/i, fix: "look forward to seeing", explain: "look forward to 뒤에는 -ing가 옵니다." },
    { re: /\bi have \d+ years old\b/i, fix: "I am ... years old", explain: "나이는 I am으로 말합니다." },
    { re: /\balmost people\b/i, fix: "most people", explain: "대부분의 사람은 most people입니다." },
    { re: /\balthough\b[^.?!]{0,90}\bbut\b/i, fix: "although 또는 but 중 하나", explain: "although과 but을 한 문장에 같이 쓰지 않습니다." },
  ];

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function normalize(text) {
    return String(text || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  }

  function countEnglishWords(text) {
    const matches = normalize(text).match(/[A-Za-z0-9]+(?:'[A-Za-z]+)?/g);
    return matches ? matches.length : 0;
  }

  function escapeReg(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function contains(text, phrase) {
    const source = normalize(text).toLowerCase();
    const needle = String(phrase || "").toLowerCase();
    if (!needle) return false;
    if (needle.includes(" ")) return source.includes(needle);
    const body = escapeReg(needle);
    return new RegExp("\\b" + body + "(?:es|s|ed|ing)?\\b", "i").test(source);
  }

  function countPhrase(text, phrase) {
    const body = escapeReg(phrase).replace(/\s+/g, "\\s+");
    const re = new RegExp("\\b" + body + "\\b", "gi");
    return (normalize(text).match(re) || []).length;
  }

  function thinThreshold(difficulty) {
    if (difficulty === "beginner") return 18;
    if (difficulty === "advanced") return 40;
    return 28;
  }

  function paceTarget(difficulty) {
    if (difficulty === "beginner") return [90, 150];
    if (difficulty === "advanced") return [115, 165];
    return [105, 160];
  }

  function bandLabel(score) {
    if (score >= 90) return "설득력 있는 답변";
    if (score >= 80) return "면접에서 통할 수준";
    if (score >= 70) return "방향은 맞습니다";
    if (score >= 60) return "뼈대를 더 분명히";
    return "핵심부터 다시 말하기";
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function fill(value, major) {
    return String(value == null ? "" : value).split("{major}").join(major);
  }

  function personalize(question, majorEn) {
    const major = majorEn || "your field";
    return {
      id: question.id,
      kind: "main",
      purposes: question.purposes.slice(),
      difficulties: question.difficulties.slice(),
      major: question.major,
      template: !!question.template,
      expectsStar: !!question.expectsStar,
      focus: question.focus,
      text: fill(question.text, major),
      keywords: question.keywords.map(function (keyword) { return fill(keyword, major); }),
      followUps: (question.followUps || []).map(function (line) { return fill(line, major); }),
      model: fill(question.model, major),
      mainNumber: null,
      parentMain: null,
    };
  }

  function pickQuestions(config, bank) {
    const count = Number(config.count) || 3;
    const majorId = config.majorId;
    const fit = function (question) {
      return question.purposes.indexOf(config.purpose) !== -1 &&
        question.difficulties.indexOf(config.difficulty) !== -1;
    };
    const specific = shuffle(bank.filter(function (question) {
      return fit(question) && question.major === majorId && question.major !== "general";
    }));
    const templates = shuffle(bank.filter(function (question) {
      return fit(question) && question.template;
    }));
    const general = shuffle(bank.filter(function (question) {
      return fit(question) && question.major === "general" && !question.template;
    }));
    const picked = [];
    const used = new Set();

    function take(arr) {
      while (arr.length) {
        const item = arr.pop();
        if (!item || used.has(item.id)) continue;
        used.add(item.id);
        picked.push(personalize(item, config.majorEn));
        return true;
      }
      return false;
    }

    const specificTarget = count >= 5 ? 2 : 1;
    let taken = 0;
    while (taken < specificTarget && take(specific)) taken += 1;
    take(templates);
    while (picked.length < count && take(general)) {
      /* fill from the matching pool */
    }
    if (picked.length < count) {
      const extra = shuffle(bank.filter(function (question) {
        return question.purposes.indexOf(config.purpose) !== -1 &&
          !used.has(question.id) &&
          (question.major === "general" || question.major === majorId);
      }));
      while (picked.length < count && take(extra)) {
        /* nearby fallback */
      }
    }
    picked.forEach(function (question, index) {
      question.mainNumber = index + 1;
    });
    return picked;
  }

  function structureOf(answer, expectsStar) {
    if (expectsStar) {
      const parts = [
        { id: "situation", label: "상황", hit: /\b(when|while|during|last|semester|year|at my|in my|in the)\b/i.test(answer) },
        { id: "task", label: "역할", hit: /\b(responsible|my role|i needed|i had to|i was asked|goal was|my job)\b/i.test(answer) },
        { id: "action", label: "행동", hit: /\b(i decided|i led|i made|i created|i organized|i built|i wrote|i talked|i asked|i started|i analyzed|i planned|i changed|i explained|i reinforced|i counted)\b/i.test(answer) },
        { id: "result", label: "결과", hit: /\b(as a result|therefore|in the end|i learned|improved|increased|the result|outcome|ended up|we finished|it held)\b/i.test(answer) },
      ];
      return { mode: "star", parts: parts, hitCount: parts.filter(function (part) { return part.hit; }).length };
    }
    const parts = [
      { id: "claim", label: "주장", hit: /\b(i want|i hope|i believe|my goal|i chose|i would|i plan|i am interested|i'm interested|i follow|i used to)\b/i.test(answer) },
      { id: "reason", label: "이유", hit: /\b(because|since|so that|the reason|this is why)\b/i.test(answer) },
      { id: "example", label: "예시", hit: /\b(for example|for instance|such as|when i|last|recently|in my|a time)\b/i.test(answer) },
    ];
    return { mode: "point", parts: parts, hitCount: parts.filter(function (part) { return part.hit; }).length };
  }

  function paceScore(wpm, difficulty) {
    if (wpm == null) return null;
    const range = paceTarget(difficulty);
    if (wpm >= range[0] && wpm <= range[1]) return 94;
    const distance = wpm < range[0] ? range[0] - wpm : wpm - range[1];
    return clamp(Math.round(94 - distance * 1.1), 28, 94);
  }

  function analyze(input) {
    const text = normalize(input.answer);
    const question = input.question;
    const difficulty = input.difficulty || "intermediate";
    const speechMs = Number(input.speechMs) || 0;
    const wordCount = countEnglishWords(text);
    const hangulChars = (text.match(/[가-힣]/g) || []).length;
    const letters = (text.match(/[A-Za-z가-힣]/g) || []).length;
    const hangulRatio = letters ? hangulChars / letters : 0;

    const grammar = [];
    PATTERNS.forEach(function (pattern) {
      if (grammar.length >= 4) return;
      const found = text.match(pattern.re);
      if (found) {
        grammar.push({ excerpt: found[0], fix: pattern.fix, explain: pattern.explain });
      }
    });
    const scrubbed = text.replace(/\b(?:i\.e\.|e\.g\.)/gi, " ");
    if (grammar.length < 4 && /\bi\b/.test(scrubbed)) {
      grammar.push({ excerpt: "i", fix: "I", explain: "주어 I는 항상 대문자로 씁니다." });
    }
    if (grammar.length < 4 && (/^[a-z]/.test(text) || /[.?!]\s+[a-z]/.test(text))) {
      grammar.push({ excerpt: "문장 시작", fix: "대문자", explain: "문장 첫 글자는 대문자로 시작하세요." });
    }
    if (grammar.length < 4 && wordCount > 12 && !/[.?!]$/.test(text)) {
      grammar.push({ excerpt: "마침표", fix: ".", explain: "문장 끝에 마침표를 찍으면 답이 정리되어 보입니다." });
    }
    const repeated = text.match(/\b([A-Za-z]{2,})\s+\1\b/i);
    if (grammar.length < 4 && repeated) {
      grammar.push({ excerpt: repeated[0], fix: repeated[1], explain: "같은 단어가 바로 반복되었습니다." });
    }
    const longSentence = text.split(/[.?!]+/).some(function (sentence) {
      return countEnglishWords(sentence) > 45;
    });

    let grammarScore = 92 - Math.min(grammar.length, 4) * 11;
    if (longSentence) grammarScore -= 4;
    if (hangulRatio > 0.25) grammarScore = Math.min(grammarScore, 45);
    grammarScore = clamp(Math.round(grammarScore), 15, 100);

    const vocabulary = [];
    BASICS.forEach(function (item) {
      if (vocabulary.length >= 3) return;
      if (countPhrase(text, item.word) > 0) {
        vocabulary.push({ from: item.word, to: item.to });
      }
    });
    let connectorCount = 0;
    CONNECTORS.forEach(function (phrase) {
      if (contains(text, phrase)) connectorCount += 1;
    });
    let vocabularyScore = difficulty === "advanced" ? 68 : difficulty === "intermediate" ? 74 : 80;
    vocabularyScore += Math.min(connectorCount, 2) * 8;
    vocabularyScore -= Math.min(vocabulary.length, 3) * (difficulty === "beginner" ? 2 : 6);
    if (difficulty === "advanced" && connectorCount === 0 && wordCount > 45) vocabularyScore -= 8;
    vocabularyScore = clamp(Math.round(vocabularyScore), 30, 100);

    const fillers = [];
    function pushFiller(label, re) {
      const count = (text.match(re) || []).length;
      if (count > 0) fillers.push({ label: label, count: count });
    }
    pushFiller("um/uh", /\b(?:um+|uh+|erm+|umm+)\b/gi);
    pushFiller("you know", /\byou know\b/gi);
    pushFiller("kind of", /\bkind of\b/gi);
    pushFiller("sort of", /\bsort of\b/gi);
    pushFiller("I mean", /\bi mean\b/gi);
    pushFiller("basically", /\bbasically\b/gi);
    const actually = (text.match(/\bactually\b/gi) || []).length;
    if (actually >= 3) fillers.push({ label: "actually", count: actually });
    const fillerTotal = fillers.reduce(function (sum, item) { return sum + item.count; }, 0);

    let wpm = null;
    if (speechMs >= 2000 && wordCount > 0) {
      const raw = Math.round(wordCount / (speechMs / 60000));
      if (raw <= 320) wpm = raw;
    }
    const pace = paceScore(wpm, difficulty);

    const structure = structureOf(text, !!question.expectsStar);
    let structureScore = Math.round((structure.hitCount / structure.parts.length) * 100);
    if (wordCount >= 30 && structure.hitCount >= 1) structureScore = Math.max(structureScore, 45);
    if (wordCount < 12) structureScore = Math.min(structureScore, 42);
    structureScore = clamp(structureScore, 8, 100);

    const keywords = question.keywords || [];
    const keywordsHit = keywords.filter(function (keyword) { return contains(text, keyword); }).slice(0, 8);
    const needed = Math.min(6, keywords.length || 1);
    const ratio = keywords.length ? Math.min(1, keywordsHit.length / needed) : 0.5;
    let relevance = Math.round(28 + ratio * 72);
    if (wordCount < 10) relevance = Math.min(relevance, 40);
    else if (wordCount < 18) relevance = Math.min(relevance, 70);
    if (hangulRatio > 0.25) relevance = Math.min(relevance, 34);
    if (question.kind === "followup") {
      const lengthScore = wordCount >= 40 ? 88 : wordCount >= 22 ? 74 : wordCount >= 12 ? 58 : 36;
      relevance = Math.round(relevance * 0.5 + lengthScore * 0.5);
    }
    relevance = clamp(relevance, 8, 100);

    const scores = {
      grammar: grammarScore,
      vocabulary: vocabularyScore,
      pace: pace,
      structure: structureScore,
      relevance: relevance,
      overall: 0,
    };
    const weights = pace == null
      ? { grammar: 0.26, vocabulary: 0.18, structure: 0.3, relevance: 0.26 }
      : { grammar: 0.22, vocabulary: 0.16, pace: 0.16, structure: 0.24, relevance: 0.22 };
    let overall = 0;
    Object.keys(weights).forEach(function (key) {
      overall += scores[key] * weights[key];
    });
    overall -= Math.min(10, fillerTotal * 2);
    scores.overall = clamp(Math.round(overall), 0, 100);

    const comments = [];
    if (hangulRatio > 0.15) {
      comments.push("영어 면접 연습이므로, 핵심 문장부터 영어로 다시 말해 보세요.");
    }
    if (wordCount < thinThreshold(difficulty)) {
      comments.push("분량이 짧습니다. 주장, 이유, 예시가 한 문장씩만 있어도 답이 섭니다.");
    }
    const missing = structure.parts.filter(function (part) { return !part.hit; }).map(function (part) { return part.label; });
    if (missing.length && wordCount >= 8) {
      const hint = structure.mode === "star"
        ? "마지막에 그래서 무엇이 달라졌는지 말해 보세요."
        : "빠진 부분을 한 문장으로 덧붙이세요.";
      comments.push("빠져 있는 흐름: " + missing.join(", ") + ". " + hint);
    }
    if (wpm != null) {
      const range = paceTarget(difficulty);
      if (wpm < range[0]) {
        comments.push("말하기 속도가 분당 " + wpm + "단어입니다. 핵심 문장을 미리 정해 두면 덜 느려집니다. 권장 구간은 " + range[0] + "–" + range[1] + "입니다.");
      } else if (wpm > range[1]) {
        comments.push("말하기 속도가 분당 " + wpm + "단어입니다. 문장 끝에서 잠시 쉬세요. 권장 구간은 " + range[0] + "–" + range[1] + "입니다.");
      } else if (comments.length < 3) {
        comments.push("분당 " + wpm + "단어로, 듣기 좋은 속도입니다.");
      }
    }
    if (fillerTotal > 0) {
      const bits = fillers.map(function (item) { return item.label + " " + item.count + "회"; });
      comments.push("군더더기가 있습니다: " + bits.join(", ") + ". 그 자리에 잠깐 침묵을 두세요.");
    }
    if (longSentence) {
      comments.push("한 문장이 너무 깁니다. 마침표로 나누면 면접관이 따라오기 쉽습니다.");
    }
    if (relevance < 65 && hangulRatio <= 0.15) {
      comments.push("질문의 의도(" + (question.focus || "핵심") + ")에 맞는 말을 답의 첫 문장에 두세요.");
    }
    if (scores.overall >= 84 && comments.length < 3 && hangulRatio < 0.1) {
      comments.push("뼈대는 좋습니다. 같은 구조로 한 번 더 소리 내어 말해 보세요.");
    }

    return {
      wordCount: wordCount,
      hangulRatio: hangulRatio,
      wpm: wpm,
      fillers: fillers,
      grammar: grammar,
      vocabulary: vocabulary,
      structure: structure,
      keywordsHit: keywordsHit,
      scores: scores,
      comments: comments.slice(0, 4),
    };
  }

  function createFollowUp(question, analysis, difficulty, used) {
    if (!question || question.kind === "followup" || used >= 2) return null;
    if (analysis.hangulRatio > 0.35) return null;
    const words = analysis.wordCount;
    let text = "";
    let expectsStar = false;
    let focus = "";
    let model = "";
    if (words < thinThreshold(difficulty)) {
      text = "Could you walk through one specific example, including what you did and what happened after that?";
      expectsStar = true;
      focus = "구체적인 예시";
      model = "Last semester, I was responsible for a small part of a team project. I noticed the weak point, changed one step, and checked it with the group. As a result, we finished with a clearer outcome, and I learned what to do earlier next time.";
    } else if (question.expectsStar && analysis.structure.hitCount < 2) {
      text = "What action did you take, and what result followed?";
      expectsStar = true;
      focus = "행동과 결과";
      model = "My role was to keep the work moving. First I named the problem, then I made one change and told the group what I needed. In the end, the result was concrete, and I could explain it in two sentences.";
    } else if (difficulty === "advanced" || (difficulty === "intermediate" && analysis.scores.relevance >= 78 && Math.random() < 0.45)) {
      text = (question.followUps && question.followUps[0]) || "What tradeoff did you accept, and why was it worth it?";
      expectsStar = false;
      focus = "더 깊은 근거";
      model = "The tradeoff was between a safer choice and a more useful one. I chose the useful one because the goal mattered more than looking perfect. I would do it again, but I would set a checkpoint earlier.";
    } else {
      return null;
    }
    return {
      id: question.id + "-fu-" + (used + 1),
      kind: "followup",
      purposes: (question.purposes || []).slice(),
      difficulties: (question.difficulties || []).slice(),
      major: question.major,
      template: false,
      expectsStar: expectsStar,
      focus: focus,
      text: text,
      keywords: (question.keywords || []).slice(),
      followUps: [],
      model: model,
      mainNumber: null,
      parentMain: question.mainNumber || question.parentMain || null,
    };
  }

  function buildSession(config, rawTurns) {
    const turns = rawTurns.map(function (raw) {
      const analysis = raw.analysis;
      return {
        kind: raw.question.kind,
        mainNumber: raw.question.mainNumber || null,
        parentMain: raw.question.parentMain || null,
        prompt: raw.question.text,
        focus: raw.question.focus,
        answer: raw.answer,
        responseSec: raw.responseSec,
        speechSec: raw.speechMs ? Math.max(1, Math.round(raw.speechMs / 1000)) : null,
        wpm: analysis.wpm,
        scores: analysis.scores,
        grammar: analysis.grammar,
        vocabulary: analysis.vocabulary,
        structure: analysis.structure,
        keywordsHit: analysis.keywordsHit,
        fillers: analysis.fillers,
        comments: analysis.comments,
        model: raw.question.model,
        wordCount: analysis.wordCount,
      };
    });

    const dimensions = {};
    DIMENSIONS.forEach(function (dimension) {
      const nums = turns
        .map(function (turn) { return turn.scores[dimension.id]; })
        .filter(function (value) { return typeof value === "number"; });
      dimensions[dimension.id] = nums.length
        ? Math.round(nums.reduce(function (sum, value) { return sum + value; }, 0) / nums.length)
        : null;
    });
    const overall = Math.round(turns.reduce(function (sum, turn) {
      return sum + turn.scores.overall;
    }, 0) / turns.length);
    const paceMeasured = turns.some(function (turn) { return turn.wpm != null; });
    const ranked = DIMENSIONS.map(function (dimension) { return dimension.id; })
      .filter(function (id) { return typeof dimensions[id] === "number"; });
    const weakPriority = ["structure", "relevance", "grammar", "vocabulary", "pace"];
    const weakest = ranked.slice().sort(function (a, b) {
      return dimensions[a] - dimensions[b] || weakPriority.indexOf(a) - weakPriority.indexOf(b);
    })[0];
    const strongest = ranked.slice().sort(function (a, b) {
      return dimensions[b] - dimensions[a] || weakPriority.indexOf(a) - weakPriority.indexOf(b);
    })[0];
    const weaknesses = ranked.filter(function (id) { return dimensions[id] < 72; });
    const fillerMap = new Map();
    turns.forEach(function (turn) {
      turn.fillers.forEach(function (filler) {
        fillerMap.set(filler.label, (fillerMap.get(filler.label) || 0) + filler.count);
      });
    });

    return {
      id: globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : "s-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      config: config,
      overall: overall,
      dimensions: dimensions,
      paceMeasured: paceMeasured,
      weakest: weakest,
      strongest: strongest,
      weaknesses: weaknesses,
      fillers: Array.from(fillerMap, function (entry) { return { label: entry[0], count: entry[1] }; }),
      turns: turns,
    };
  }

  const root = typeof window !== "undefined" ? window : globalThis;
  root.InterviewEngine = {
    DIMENSIONS: DIMENSIONS,
    countEnglishWords: countEnglishWords,
    thinThreshold: thinThreshold,
    paceTarget: paceTarget,
    bandLabel: bandLabel,
    pickQuestions: pickQuestions,
    analyze: analyze,
    createFollowUp: createFollowUp,
    buildSession: buildSession,
  };
})();
