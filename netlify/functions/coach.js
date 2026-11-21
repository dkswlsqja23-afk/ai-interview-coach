"use strict";

function readKey(primary, fallback) {
  var value = process.env[primary] || process.env[fallback] || "";
  value = String(value).trim();
  if (value.startsWith("image.")) value = value.slice(6);
  return value;
}

function studentAnswerFromTurn(turn) {
  var text = turn.userAnswer != null ? turn.userAnswer : turn.answer;
  return String(text == null ? "" : text).trim();
}

function buildPrompt(data) {
  var lines = [];
  lines.push("You are an English interview coach helping a Korean student.");
  lines.push("Purpose: " + (data.purpose || ""));
  lines.push("Major or role: " + (data.major || ""));
  lines.push("Difficulty: " + (data.difficulty || ""));
  lines.push("");
  lines.push("Rules (mandatory):");
  lines.push("- Feedback must be based ONLY on each line labeled 'Student answer'. That text is what the candidate typed or spoke.");
  lines.push("- Never treat 'Reference model answer' as the student's answer. Do not copy or paraphrase the reference as if it were theirs.");
  lines.push("- In each turn note (Korean), evaluate grammar, vocabulary, relevance to the question, logical structure, and one concrete improvement based on the student answer.");
  lines.push("- rewrite must improve the SAME ideas in the student answer in natural English. It is not a replacement sample answer from a textbook.");
  lines.push("- Write the summary and turn notes in Korean. Write each rewrite in English.");
  lines.push('Return only JSON with this shape:');
  lines.push('{"summary":"2 Korean sentences","turns":[{"note":"1 or 2 Korean sentences","rewrite":"2 to 4 English sentences"}]}');
  var turns = Array.isArray(data.turns) ? data.turns : [];
  lines.push("The turns array must have exactly " + turns.length + " items, in the same order.");
  turns.forEach(function (turn, index) {
    var student = studentAnswerFromTurn(turn).slice(0, 1200);
    var model = String(turn.modelReference || "").trim().slice(0, 800);
    lines.push("");
    lines.push("Question " + (index + 1) + ": " + String(turn.prompt || "").slice(0, 500));
    lines.push("Student answer " + (index + 1) + ": " + student);
    if (model) {
      lines.push("Reference model answer " + (index + 1) + " (comparison only, NOT the student): " + model);
    }
  });
  return lines.join("\n");
}

function parseCoachJson(text) {
  var clean = String(text || "").trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return JSON.parse(clean);
}

async function callGemini(apiKey, prompt) {
  var models = ["gemini-3.8-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  var body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });
  for (var i = 0; i < models.length; i += 1) {
    var model = models[i];
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
    try {
      var response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: body,
      });
      if (!response.ok) continue;
      var payload = await response.json();
      var parts = payload && payload.candidates && payload.candidates[0] && payload.candidates[0].content && payload.candidates[0].content.parts;
      if (!parts) continue;
      var text = "";
      parts.forEach(function (part) {
        if (part && part.text && !part.thought) text += part.text;
      });
      if (text) return text;
    } catch (error) {
      /* try next model */
    }
  }
  return null;
}

async function callGroq(apiKey, prompt) {
  try {
    var response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) return null;
    var payload = await response.json();
    return payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
  } catch (error) {
    return null;
  }
}

function jsonResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "method-not-allowed" });
  }

  var data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (error) {
    return jsonResponse(400, { error: "invalid-json" });
  }

  if (!data || !Array.isArray(data.turns) || !data.turns.length) {
    return jsonResponse(400, { error: "missing-turns" });
  }

  var nonempty = data.turns.filter(function (turn) {
    return studentAnswerFromTurn(turn).length > 0;
  });
  if (!nonempty.length) {
    return jsonResponse(400, { error: "missing-student-answers" });
  }
  if (nonempty.length < data.turns.length) {
    return jsonResponse(400, { error: "missing-student-answers" });
  }

  var geminiKey = readKey("GEMINI_API_KEY", "gemini_api_key");
  var groqKey = readKey("GROQ_API_KEY", "groq_api_key");
  if (!geminiKey && !groqKey) {
    return jsonResponse(503, { error: "coach-unconfigured" });
  }

  var prompt = buildPrompt(data);
  var provider = null;
  var text = null;

  if (geminiKey) {
    text = await callGemini(geminiKey, prompt);
    if (text) provider = "gemini";
  }
  if (!text && groqKey) {
    text = await callGroq(groqKey, prompt);
    if (text) provider = "groq";
  }

  if (!text) {
    return jsonResponse(502, { error: "coach-unavailable" });
  }

  try {
    var coach = parseCoachJson(text);
    if (!coach || !coach.summary) {
      return jsonResponse(502, { error: "coach-invalid-response" });
    }
    return jsonResponse(200, {
      provider: provider,
      summary: String(coach.summary),
      turns: Array.isArray(coach.turns) ? coach.turns : [],
    });
  } catch (error) {
    return jsonResponse(502, { error: "coach-parse-failed" });
  }
};