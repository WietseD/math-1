const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

const inRange = (n) => Number.isInteger(n) && n >= 0 && n <= 10;

test("every possible question is valid and has the correct answer", () => {
  const pool = L.buildPool();
  assert.ok(pool.some((q) => q.op === "+") && pool.some((q) => q.op === "\u2212"));
  for (const q of pool) {
    assert.ok(inRange(q.a) && inRange(q.b) && inRange(q.answer), JSON.stringify(q));
    assert.equal(q.answer, q.op === "+" ? q.a + q.b : q.a - q.b);
  }
});

test("sessions: valid, mixed, no immediate repeats, balanced", () => {
  for (let run = 0; run < 300; run++) {
    const s = L.createSession({ total: 20 });
    let prev = null, adds = 0, subs = 0;
    for (let i = 0; i < 20; i++) {
      const q = s.current;
      const id = q.a + q.op + q.b;
      assert.notEqual(id, prev);
      prev = id;
      q.op === "+" ? adds++ : subs++;
      assert.equal(s.submit(String(q.answer)).result, "correct");
      s.advance();
    }
    assert.ok(adds >= 5 && subs >= 5, `unbalanced ${adds}/${subs}`);
  }
});

test("incorrect answers keep the question and do not count", () => {
  const s = L.createSession({ total: 20 });
  const q = s.current;
  const wrong = String((q.answer + 1) % 11);
  assert.equal(s.submit(wrong).result, "incorrect");
  assert.equal(s.completed, 0);
  assert.equal(s.current, q);
  assert.equal(s.advance(), null);
  assert.equal(s.submit(String(q.answer)).result, "correct");
  assert.equal(s.completed, 1);
});

test("rapid double submit counts once", () => {
  const s = L.createSession({ total: 20 });
  const a = String(s.current.answer);
  assert.equal(s.submit(a).result, "correct");
  assert.equal(s.submit(a).result, "ignored");
  assert.equal(s.completed, 1);
});

test("session ends at exactly 20 and never goes past it", () => {
  const s = L.createSession({ total: 20 });
  let last;
  for (let i = 0; i < 20; i++) { last = s.submit(String(s.current.answer)); s.advance(); }
  assert.equal(last.finished, true);
  assert.equal(s.completed, 20);
  assert.equal(s.advance(), null);
  assert.equal(s.submit("0").result, "ignored");
  assert.equal(s.completed, 20);
});

test("invalid input is rejected", () => {
  const s = L.createSession({ total: 20 });
  assert.equal(s.submit("").result, "empty");
  for (const bad of ["-1", "1.5", "11", "05", "abc", " 3", "100"]) assert.equal(s.submit(bad).result, "invalid", bad);
  assert.equal(s.completed, 0);
});

test("keypad entry supports 10, 0 and blocks leading zeros", () => {
  assert.equal(L.appendDigit(L.appendDigit("", "1"), "0"), "10");
  assert.equal(L.appendDigit("10", "5"), "10");
  assert.equal(L.appendDigit("5", "5"), "5");
  assert.equal(L.appendDigit("0", "7"), "7");
  assert.equal(L.appendDigit("", "0"), "0");
  assert.equal(L.parseAnswer("10"), 10);
});

test("new sessions start fresh", () => {
  const a = L.createSession({ total: 20 });
  a.submit(String(a.current.answer));
  const b = L.createSession({ total: 20 });
  assert.equal(b.completed, 0);
});
