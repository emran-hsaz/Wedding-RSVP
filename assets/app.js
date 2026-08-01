/* ═══════════════════════════════════════════════════════════════
   Ahmed & Rawan — wedding site
   Countdown · scroll reveal · Google Forms RSVP relay
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── Google Form wiring ───────────────────────────────────────
     Entry IDs extracted from the live form's FB_PUBLIC_LOAD_DATA_
     https://docs.google.com/forms/d/e/<FORM_ID>/viewform
  ------------------------------------------------------------- */
  var FORM_ID = "1FAIpQLSeSD16PNk9E58y66-ZE1n2k4e8hrH2YjhoCexKhlGOcYEVKKQ";
  var ENDPOINT = "https://docs.google.com/forms/d/e/" + FORM_ID + "/formResponse";

  var FIELDS = {
    attendance:   "entry.877086558",   // "Will you be joining us?"              (required)
    fullName:     "entry.1498135098",  // "Your Full Name"                       (required)
    guests:       "entry.111771323",   // "Number  of Attendance ( Total Guests )" (required)
    invitedGuest: "entry.2606285"      // "Invited guest's full name "           (optional)
  };

  /* The guest-count question is currently a DROPDOWN. Google Forms does not
     support a real "Other" choice on dropdowns — only on Multiple choice and
     Checkboxes. (The form does have a plain option whose label is literally
     "other", but that is an ordinary option: picking it just submits the
     string "other", with nowhere to record a guest count.)

     Flip this to true *after* changing that question to "Multiple choice"
     and clicking "Add Other" in the form editor. The entry ID is unchanged
     by that edit, and nothing else here needs to change. */
  var GUESTS_OTHER_ENABLED = false;

  var OTHER_SENTINEL = "__other_option__";
  var OTHER_LABEL = "5+ guests (please specify)";

  /* ── Envelope intro gate ──────────────────────────────────────
     Shown on every fresh load — it's part of the invitation. Opening
     requires a deliberate click; a "Skip intro" affordance fades in
     after 4s so nobody is ever stuck waiting.
  ------------------------------------------------------------- */
  (function envelopeGate() {
    var gate = document.getElementById("gate");
    var site = document.getElementById("site");
    if (!gate || !site) {
      document.documentElement.classList.remove("gate-active");
      return;
    }

    var openBtn = document.getElementById("gate-open");
    var skipBtn = document.getElementById("gate-skip");
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var opened = false, finished = false, skipTimer;

    function reveal() {
      if (finished) return;
      finished = true;
      clearTimeout(skipTimer);

      gate.classList.add("is-leaving");
      document.documentElement.classList.remove("gate-active");

      // Land where the visitor asked to land — top by default, or the
      // section named in the URL hash — before anything becomes visible.
      var target = location.hash && document.querySelector(location.hash);
      if (target) target.scrollIntoView();
      else window.scrollTo(0, 0);

      site.classList.add("is-revealed");

      setTimeout(function () {
        if (gate.parentNode) gate.parentNode.removeChild(gate);
      }, calm ? 0 : 700);
    }

    function open() {
      if (opened) return;
      opened = true;
      clearTimeout(skipTimer);
      skipBtn.classList.remove("is-visible");
      gate.classList.add("is-open");

      // Once it's opening, a tap anywhere cuts straight to the site. Bound on
      // a delay so the very click that opened the envelope doesn't bubble up
      // and skip the animation it just started.
      setTimeout(function () { gate.addEventListener("click", reveal); }, 300);

      // flap 0.7s → card rises → whole gate leaves: ~1.7s click-to-reveal
      setTimeout(reveal, calm ? 0 : 1150);
    }

    openBtn.addEventListener("click", open);
    skipBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      reveal();
    });

    skipTimer = setTimeout(function () {
      if (!opened) skipBtn.classList.add("is-visible");
    }, 4000);
  })();

  /* ── Countdown ────────────────────────────────────────────────
     Saturday 10 October 2026, 8:00 PM in Asia/Amman.
     Jordan sits at a fixed UTC+3 year-round (DST was abolished in
     2022), so the explicit +03:00 offset below *is* Asia/Amman — and
     unlike Intl-based math it resolves identically in every browser
     and in every visitor's local timezone.
  ------------------------------------------------------------- */
  var TARGET = new Date("2026-10-10T20:00:00+03:00").getTime();

  var clock = document.getElementById("clock");
  var out = {
    days:  document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins:  document.getElementById("cd-mins"),
    secs:  document.getElementById("cd-secs")
  };

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function tick() {
    var diff = TARGET - Date.now();

    if (diff <= 0) {
      clock.classList.add("is-done");
      clock.innerHTML =
        '<div class="unit">Today is the day &#10022;</div>';
      clearInterval(timer);
      return;
    }

    var s = Math.floor(diff / 1000);
    out.days.textContent  = String(Math.floor(s / 86400));
    out.hours.textContent = pad(Math.floor(s / 3600) % 24);
    out.mins.textContent  = pad(Math.floor(s / 60) % 60);
    out.secs.textContent  = pad(s % 60);
  }

  var timer;
  if (clock && out.days) {
    tick();
    timer = setInterval(tick, 1000);
  }

  /* ── Sticky nav shading ──────────────────────────────────────── */
  var nav = document.getElementById("nav");
  function onScroll() {
    nav.classList.toggle("is-stuck", window.scrollY > 40);
  }
  if (nav) {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ── Scroll reveal ───────────────────────────────────────────── */
  var revealables = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // stagger siblings slightly for a softer cascade
        el.style.transitionDelay = Math.min(i * 70, 280) + "ms";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ── RSVP form ───────────────────────────────────────────────── */
  var form       = document.getElementById("rsvp-form");
  var thanks     = document.getElementById("thanks");
  var thanksBody = document.getElementById("thanks-body");
  var statusEl   = document.getElementById("form-status");
  var submitBtn  = document.getElementById("submit-btn");
  var guestsSel  = document.getElementById("guests");
  var otherWrap  = document.getElementById("guests-other-wrap");
  var otherInput = document.getElementById("guestsOther");
  var againBtn   = document.getElementById("another-btn");

  if (!form) return;

  // Add the "5+" choice only when the backing form can actually accept it.
  if (GUESTS_OTHER_ENABLED) {
    var opt = document.createElement("option");
    opt.value = OTHER_SENTINEL;
    opt.textContent = OTHER_LABEL;
    guestsSel.appendChild(opt);
  }

  function isOther() {
    return GUESTS_OTHER_ENABLED && guestsSel.value === OTHER_SENTINEL;
  }

  guestsSel.addEventListener("change", function () {
    otherWrap.hidden = !isOther();
    if (!otherWrap.hidden) otherInput.focus();
    clearError("guests");
  });

  function showError(name, on) {
    var msg = form.querySelector('[data-error-for="' + name + '"]');
    if (msg) msg.hidden = !on;

    if (name === "attendance") {
      form.querySelector("#attendance-group").classList.toggle("is-invalid", on);
    } else {
      var input = form.querySelector("#" + name);
      if (input) input.classList.toggle("is-invalid", on);
    }
  }
  function clearError(name) { showError(name, false); }

  ["fullName", "guestsOther"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { clearError(id); });
  });
  form.querySelectorAll('input[name="attendance"]').forEach(function (r) {
    r.addEventListener("change", function () { clearError("attendance"); });
  });

  function validate() {
    var firstBad = null;

    var name = form.fullName.value.trim();
    showError("fullName", !name);
    if (!name) firstBad = firstBad || form.fullName;

    var attendance = form.querySelector('input[name="attendance"]:checked');
    showError("attendance", !attendance);
    if (!attendance) firstBad = firstBad || form.querySelector('input[name="attendance"]');

    var guests = guestsSel.value;
    showError("guests", !guests);
    if (!guests) firstBad = firstBad || guestsSel;

    var otherText = otherInput.value.trim();
    var otherBad = isOther() && !otherText;
    showError("guestsOther", otherBad);
    if (otherBad) firstBad = firstBad || otherInput;

    if (firstBad) {
      firstBad.focus({ preventScroll: false });
      return null;
    }

    return {
      name: name,
      attendance: attendance.value,
      guests: guests,
      otherText: otherText,
      invitedGuest: form.invitedGuest.value.trim()
    };
  }

  function buildPayload(v) {
    var fd = new FormData();

    fd.append(FIELDS.fullName, v.name);
    fd.append(FIELDS.attendance, v.attendance);

    if (v.guests === OTHER_SENTINEL) {
      // Google Forms encodes a chosen "Other" as TWO fields:
      //   entry.N                       = "__other_option__"
      //   entry.N.other_option_response = the typed text
      fd.append(FIELDS.guests, OTHER_SENTINEL);
      fd.append(FIELDS.guests + ".other_option_response", v.otherText);
    } else {
      fd.append(FIELDS.guests, v.guests);
    }

    if (v.invitedGuest) fd.append(FIELDS.invitedGuest, v.invitedGuest);

    return fd;
  }

  function successMessage(v) {
    var first = v.name.split(/\s+/)[0];
    if (v.attendance === "Yes !!!!!!!") {
      return "Thank you, " + first + " — your seat is saved. We can’t wait to " +
             "celebrate with you on 10 October.";
    }
    if (v.attendance === "Unfortunately, can't make it") {
      return "Thank you for letting us know, " + first + ". You’ll be missed — " +
             "we’ll be thinking of you on the day.";
    }
    return "Thanks, " + first + " — we’ve noted that you’re still deciding. " +
           "Just resubmit this form once you know, before 26 September.";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var v = validate();
    if (!v) {
      statusEl.textContent = "Please complete the highlighted fields.";
      statusEl.classList.add("is-error");
      return;
    }

    statusEl.textContent = "";
    statusEl.classList.remove("is-error");
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    submitBtn.querySelector(".btn__text").textContent = "Sending…";

    // Google Forms doesn't send CORS headers, so the response is opaque:
    // we can't read status or body. Post it and confirm optimistically.
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: buildPayload(v) })
      .catch(function () { /* opaque/no-cors — nothing meaningful to handle */ })
      .then(function () {
        thanksBody.textContent = successMessage(v);
        form.hidden = true;
        thanks.hidden = false;
        thanks.scrollIntoView({ behavior: "smooth", block: "center" });
      });
  });

  againBtn.addEventListener("click", function () {
    form.reset();
    otherWrap.hidden = true;
    ["fullName", "attendance", "guests", "guestsOther"].forEach(clearError);
    statusEl.textContent = "";
    submitBtn.disabled = false;
    submitBtn.classList.remove("is-loading");
    submitBtn.querySelector(".btn__text").textContent = "Send RSVP";
    thanks.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.fullName.focus();
  });
})();
