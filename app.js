// UI wiring. All state lives in memory only: nothing is saved or sent anywhere.
(function () {
  "use strict";
  var cfg = window.APP_CONFIG;
  var L = window.MathLogic;
  var $ = function (id) { return document.getElementById(id); };
  var screens = { lock: $("screen-lock"), home: $("screen-home"), play: $("screen-play"), done: $("screen-done") };

  var session = null;
  var answerText = "";
  var pinText = "";
  var current = "home";
  var finishTimer = null;

  function show(name) {
    clearTimeout(finishTimer);
    current = name;
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    if (name !== "play") {
      var h = screens[name].querySelector("h1");
      if (h) h.focus({ preventScroll: true });
    }
  }

  // ---- Keypad (built once per container, so listeners are never duplicated) ----
  function buildKeypad(container, submitLabel, handlers) {
    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "submit"];
    keys.forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.key = k;
      if (k === "back") { b.className = "key key-back"; b.innerHTML = "<span aria-hidden=\"true\">\u232B</span>"; b.setAttribute("aria-label", "Wis"); }
      else if (k === "submit") { b.className = "key key-submit"; b.textContent = submitLabel; }
      else { b.className = "key"; b.textContent = k; }
      container.appendChild(b);
    });
    container.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn || btn.disabled) return;
      var k = btn.dataset.key;
      if (k === "back") handlers.back();
      else if (k === "submit") handlers.submit();
      else handlers.digit(k);
    });
    return container;
  }

  function setKeysDisabled(container, disabled) {
    container.querySelectorAll(".key:not(.key-submit)").forEach(function (b) { b.disabled = disabled; });
  }

  // ---- Lock screen ----
  async function sha256(text) {
    var data = new TextEncoder().encode(text);
    var buf = await crypto.subtle.digest("SHA-256", data);
    return Array.prototype.map.call(new Uint8Array(buf), function (x) { return x.toString(16).padStart(2, "0"); }).join("");
  }

  function renderPin() { $("pin-display").textContent = "\u25CF ".repeat(pinText.length).trim(); }

  var checkingPin = false;
  async function trySubmitPin() {
    if (checkingPin || pinText === "") return;
    checkingPin = true;
    try {
      if (!window.crypto || !crypto.subtle) throw new Error("no-crypto");
      var ok = (await sha256(pinText)) === cfg.pinSha256;
      if (ok) { pinText = ""; renderPin(); $("lock-msg").textContent = ""; show("home"); }
      else { pinText = ""; renderPin(); $("lock-msg").textContent = "Die pincode klopt niet. Probeer het opnieuw."; }
    } catch (err) {
      $("lock-msg").textContent = "De vergrendeling werkt alleen op een beveiligde pagina (https). Vraag het aan een volwassene.";
    }
    checkingPin = false;
  }

  buildKeypad($("lock-keypad"), "Open", {
    digit: function (d) { if (pinText.length < 8) { pinText += d; renderPin(); $("lock-msg").textContent = ""; } },
    back: function () { pinText = pinText.slice(0, -1); renderPin(); },
    submit: trySubmitPin
  });

  // ---- Practice screen ----
  var playKeypad = $("play-keypad");

  function renderAnswer() { $("answer").textContent = answerText === "" ? "\u00A0" : answerText; }

  function setFeedback(kind, text) {
    var el = $("feedback");
    el.className = "feedback" + (kind ? " " + kind : "");
    el.textContent = "";
    if (kind) {
      var icon = document.createElement("span");
      icon.className = "fb-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = kind === "good" ? "\u2714" : "\u2716";
      el.appendChild(icon);
    }
    el.appendChild(document.createTextNode(text || ""));
  }

  function setSubmitLabel(text) { playKeypad.querySelector(".key-submit").textContent = text; }

  function renderQuestion() {
    var q = session.current;
    $("q-a").textContent = q.a;
    $("q-op").textContent = q.op;
    $("q-b").textContent = q.b;
    $("progress-label").textContent = "Vraag " + (session.completed + 1) + " van " + session.total;
    $("bar-fill").style.width = (session.completed / session.total * 100) + "%";
    $("sr-question").textContent = "Vraag " + (session.completed + 1) + " van " + session.total + ": " +
      q.a + (q.op === "+" ? " plus " : " min ") + q.b + ".";
  }

  function startSession() {
    session = L.createSession({ total: cfg.totalQuestions });
    answerText = "";
    setFeedback(null, "");
    setKeysDisabled(playKeypad, false);
    setSubmitLabel("Klaar");
    renderAnswer();
    renderQuestion();
    show("play");
  }

  function onSubmit() {
    if (current !== "play" || !session) return;
    if (session.awaitingNext) { // "Next" step
      if (session.advance()) {
        answerText = ""; renderAnswer(); setFeedback(null, ""); setKeysDisabled(playKeypad, false);
        setSubmitLabel("Klaar"); renderQuestion();
      }
      return;
    }
    var r = session.submit(answerText).result;
    if (r === "empty") { setFeedback("bad", "Typ eerst je antwoord."); }
    else if (r === "incorrect") { setFeedback("bad", "Probeer het nog eens!"); answerText = ""; renderAnswer(); }
    else if (r === "correct") {
      $("bar-fill").style.width = (session.completed / session.total * 100) + "%";
      if (session.finished) {
        show("done");
        finishTimer = setTimeout(function () { session = null; show("home"); }, cfg.finishDelayMs);
      } else {
        setFeedback("good", "Juist!");
        setKeysDisabled(playKeypad, true);
        setSubmitLabel("Volgende");
      }
    }
  }

  buildKeypad(playKeypad, "Klaar", {
    digit: function (d) {
      if (!session || session.awaitingNext) return;
      answerText = L.appendDigit(answerText, d); renderAnswer();
      if ($("feedback").classList.contains("bad")) setFeedback(null, "");
    },
    back: function () { if (session && !session.awaitingNext) { answerText = answerText.slice(0, -1); renderAnswer(); } },
    submit: onSubmit
  });

  // ---- Physical keyboard ----
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var pad = current === "lock" ? $("lock-keypad") : current === "play" ? playKeypad : null;
    if (!pad) return;
    var k = null;
    if (/^[0-9]$/.test(e.key)) k = e.key;
    else if (e.key === "Backspace") k = "back";
    else if (e.key === "Enter" && !(e.target.closest && e.target.closest("button"))) k = "submit";
    if (k === null) return;
    e.preventDefault();
    var btn = pad.querySelector("[data-key=\"" + k + "\"]");
    if (btn && !btn.disabled) btn.click();
  });

  // ---- Home ----
  $("start").addEventListener("click", startSession);
  $("relock").addEventListener("click", function () { pinText = ""; renderPin(); show("lock"); });

  if (cfg.lockEnabled) { $("relock").hidden = false; show("lock"); } else { show("home"); }
})();
