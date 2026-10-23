// Pure maths/session logic. No DOM access, so it can be tested in Node.
(function (root) {
  "use strict";
  var MAX = 10;

  function buildPool() {
    var pool = [];
    for (var a = 0; a <= MAX; a++) {
      for (var b = 0; b <= MAX; b++) {
        if (a + b <= MAX) pool.push({ a: a, b: b, op: "+", answer: a + b });
        if (a - b >= 0) pool.push({ a: a, b: b, op: "\u2212", answer: a - b });
      }
    }
    return pool;
  }

  // Adds a digit to the current answer text. Only 0-10 can be formed.
  function appendDigit(current, digit) {
    if (current === "" || current === "0") return String(digit);
    if (current === "1" && String(digit) === "0") return "10";
    return current;
  }

  // Returns the integer 0-10, or null if the text is not a valid answer.
  function parseAnswer(text) {
    if (!/^(0|[1-9][0-9]?)$/.test(text)) return null;
    var n = Number(text);
    return n <= MAX ? n : null;
  }

  function key(q) { return q.a + q.op + q.b; }

  function createSession(options) {
    var opts = options || {};
    var total = opts.total || 20;
    var rng = opts.rng || Math.random;
    var pool = buildPool();
    var used = {};
    var counts = { add: 0, sub: 0 };
    var completed = 0;
    var current = null;
    var awaitingNext = false;

    function pick(list) { return list[Math.floor(rng() * list.length) % list.length]; }

    function nextQuestion() {
      var fresh = pool.filter(function (q) { return !used[key(q)]; });
      if (fresh.length === 0) fresh = pool.filter(function (q) { return key(q) !== (current && key(current)); });
      var wantAdd = counts.add - counts.sub <= -2 ? true : counts.add - counts.sub >= 2 ? false : rng() < 0.5;
      var preferred = fresh.filter(function (q) { return (q.op === "+") === wantAdd; });
      var q = pick(preferred.length ? preferred : fresh);
      used[key(q)] = true;
      counts[q.op === "+" ? "add" : "sub"]++;
      current = q;
      awaitingNext = false;
      return q;
    }

    nextQuestion();

    return {
      get total() { return total; },
      get completed() { return completed; },
      get current() { return current; },
      get finished() { return completed >= total; },
      get awaitingNext() { return awaitingNext; },
      // result: empty | invalid | ignored | incorrect | correct
      submit: function (text) {
        if (awaitingNext || completed >= total) return { result: "ignored" };
        if (text === "") return { result: "empty" };
        var value = parseAnswer(text);
        if (value === null) return { result: "invalid" };
        if (value !== current.answer) return { result: "incorrect" };
        completed++;
        awaitingNext = true;
        return { result: "correct", finished: completed >= total };
      },
      advance: function () {
        if (!awaitingNext || completed >= total) return null;
        return nextQuestion();
      }
    };
  }

  var api = { buildPool: buildPool, appendDigit: appendDigit, parseAnswer: parseAnswer, createSession: createSession, MAX: MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
