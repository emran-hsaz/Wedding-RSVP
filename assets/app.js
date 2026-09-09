/* ═══════════════════════════════════════════════════════════════
   Ahmed & Rawan — wedding site
   Countdown · scroll reveal · Google Forms RSVP relay
   ═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  function scrollBehavior() { return motionPreference.matches ? "auto" : "smooth"; }
  function hashTarget() {
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch (_) { return null; }
  }

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

  /* Lets the scroll-reveal cascade hold until the camera has landed, so the
     page settles in front of the visitor instead of arriving pre-assembled. */
  var gateDone = false, gateWaiters = [];
  function markGateDone() {
    gateDone = true;
    gateWaiters.forEach(function (fn) { fn(); });
    gateWaiters = [];
  }
  function whenGateDone(fn) { gateDone ? fn() : gateWaiters.push(fn); }

  /* One invitation opening per tab. Direct section links and reduced-motion
     visitors reach the content immediately. Storage is optional. */
  (function invitationGate() {
    var gate = document.getElementById("gate");
    var site = document.getElementById("site");
    if (!gate || !site) {
      document.documentElement.classList.remove("gate-active");
      markGateDone();
      return;
    }

    var openBtn = document.getElementById("gate-open");
    var skipBtn = document.getElementById("gate-skip");
    var seen = false;
    try { seen = sessionStorage.getItem("ar-invitation-opened") === "yes"; } catch (_) {}
    if (seen || location.hash || motionPreference.matches) {
      gate.remove();
      markGateDone();
      return;
    }

    var opened = false, finished = false;
    gate.hidden = false;
    site.inert = true;
    document.documentElement.classList.add("gate-active");
    openBtn.focus({ preventScroll: true });

    function handleKeys(event) {
      if (event.key === "Escape") { event.preventDefault(); reveal(); }
      if (event.key === "Tab") {
        event.preventDefault();
        (document.activeElement === openBtn ? skipBtn : openBtn).focus();
      }
    }
    gate.addEventListener("keydown", handleKeys);

    function reveal() {
      if (finished) return;
      finished = true;
      gate.classList.add("is-leaving");
      gate.inert = true;
      site.inert = false;
      document.documentElement.classList.remove("gate-active");
      try { sessionStorage.setItem("ar-invitation-opened", "yes"); } catch (_) {}

      // Land where the visitor asked to land — top by default, or the
      // section named in the URL hash — before anything becomes visible.
      var target = hashTarget();
      if (target) target.scrollIntoView({ behavior: "instant" });
      else window.scrollTo({ top: 0, behavior: "instant" });

      site.classList.add("is-revealed");

      // Hero copy starts cascading while the camera is still settling — the
      // overlap is what stops it feeling like two separate animations.
      markGateDone();
      var focusTarget = target || document.getElementById("hero-title");
      if (focusTarget) {
        focusTarget.setAttribute("tabindex", "-1");
        focusTarget.focus({ preventScroll: true });
      }

      setTimeout(function () {
        if (gate.parentNode) gate.parentNode.removeChild(gate);
      }, motionPreference.matches ? 0 : 750);
    }

    function open() {
      if (opened) return;
      opened = true;
      gate.classList.add("is-open");

      // Once it's opening, a tap anywhere cuts straight to the site. Bound on
      // a delay so the very click that opened the envelope doesn't bubble up
      // and skip the animation it just started.
      setTimeout(function () { gate.addEventListener("click", reveal); }, 300);

      setTimeout(reveal, motionPreference.matches ? 0 : 650);
    }

    openBtn.addEventListener("click", open);
    skipBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      reveal();
    });

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
      clock.innerHTML = Date.now() < new Date("2026-10-11T00:00:00+03:00").getTime()
        ? '<div class="unit">Today is the day &#10022;</div>'
        : '<div class="unit">Thank you for celebrating with us.</div>';
      clearInterval(timer);
      return;
    }

    var s = Math.floor(diff / 1000);
    var values = { days: pad(Math.floor(s / 86400)), hours: pad(Math.floor(s / 3600) % 24), mins: pad(Math.floor(s / 60) % 60), secs: pad(s % 60) };
    Object.keys(values).forEach(function (key) {
      if (out[key].textContent === values[key]) return;
      out[key].textContent = values[key];
      if (!motionPreference.matches) {
        out[key].classList.remove("is-ticking");
        requestAnimationFrame(function () { out[key].classList.add("is-ticking"); });
      }
    });
  }

  var timer;
  if (clock && out.days) {
    timer = setInterval(tick, 1000);
    tick();
  }

  /* ── Sticky nav shading ──────────────────────────────────────── */
  var nav = document.getElementById("nav");
  var heroImage = document.querySelector(".hero__image");
  var pendingScroll = false;
  function onScroll() {
    if (pendingScroll) return;
    pendingScroll = true;
    requestAnimationFrame(updateScroll);
  }
  function updateScroll() {
    pendingScroll = false;
    nav.classList.toggle("is-stuck", window.scrollY > 40);
    var range = document.documentElement.scrollHeight - window.innerHeight;
    nav.style.setProperty("--progress", range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
    if (heroImage) {
      var offset = !motionPreference.matches && window.innerWidth > 760 ? Math.min(14, window.scrollY * .035) : 0;
      heroImage.style.setProperty("--parallax", offset + "px");
    }
  }
  if (nav) {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    motionPreference.addEventListener("change", onScroll);
  }

  /* ── Scroll reveal ───────────────────────────────────────────── */
  var revealables = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // stagger siblings so a section assembles line by line
        el.style.transitionDelay = Math.min(i * 95, 420) + "ms";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });

    document.documentElement.classList.add("motion-ready");

    // Held until the intro finishes, otherwise the hero would quietly
    // animate in behind the envelope and be fully settled on arrival.
    whenGateDone(function () {
      revealables.forEach(function (el) { io.observe(el); });
    });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // Keep the current section visible in the letterhead without a scroll loop.
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        document.querySelectorAll(".nav__links a").forEach(function (link) {
          if (link.hash === "#" + entry.target.id) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-20% 0px -45% 0px", threshold: 0 });
    document.querySelectorAll("main > section").forEach(function (section) { sectionObserver.observe(section); });
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

  /* The guest count includes the person filling the form in, so the number of
     *other* names to list is one fewer. Spelling that out avoids the usual
     confusion over whether to write yourself down again. */
  var invitedHint = document.getElementById("invited-hint");
  var invitedField = document.getElementById("invitedGuest");

  function updateInvitedHint() {
    var total = parseInt(guestsSel.value, 10);   // "3 guests" → 3

    if (total === 1) {
      invitedHint.textContent = "Just yourself — you can leave this blank.";
      invitedField.placeholder = "";
      return;
    }

    if (total > 1) {
      var others = total - 1;
      invitedHint.textContent =
        "Please list the " + others + (others === 1 ? " guest" : " guests") +
        " joining you, separated by commas.";
      invitedField.placeholder = others === 1
        ? "Layla Haddad"
        : "Layla Haddad, Omar Haddad";
      return;
    }

    invitedHint.textContent = "Bringing others? List their full names, separated by commas.";
    invitedField.placeholder = "Layla Haddad, Omar Haddad";
  }

  guestsSel.addEventListener("change", function () {
    otherWrap.hidden = !isOther();
    if (!otherWrap.hidden) otherInput.focus();
    updateInvitedHint();
    clearError("guests");
  });

  function showError(name, on) {
    var msg = form.querySelector('[data-error-for="' + name + '"]');
    if (msg) msg.hidden = !on;

    if (name === "attendance") {
      form.querySelector("#attendance-group").classList.toggle("is-invalid", on);
      form.querySelectorAll('input[name="attendance"]').forEach(function (radio) { radio.setAttribute("aria-invalid", String(on)); });
    } else {
      var input = form.querySelector("#" + name);
      if (input) {
        input.classList.toggle("is-invalid", on);
        input.setAttribute("aria-invalid", String(on));
      }
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
      return "Thank you, " + first + " — your reply has been sent. We can’t wait to " +
             "celebrate with you on 10 October.";
    }
    if (v.attendance === "Unfortunately, can't make it") {
      return "Thank you for letting us know, " + first + ". You’ll be missed — " +
             "we’ll be thinking of you on the day.";
    }
    return "Thanks, " + first + " — your reply has been sent. " +
           "Just resubmit this form once you know, before 26 September.";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

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

    // A resolved opaque response means dispatch, not verified acceptance.
    // Network errors must never be displayed as successful RSVPs.
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: buildPayload(v), signal: controller.signal })
      .then(function () {
        thanksBody.textContent = successMessage(v);
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus({ preventScroll: true });
        thanks.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
      })
      .catch(function (error) {
        statusEl.textContent = error.name === "AbortError"
          ? "Delivery is taking longer than expected. Your reply may have been sent. You can use our RSVP form below if you’re unsure."
          : "We couldn’t send your reply. Please check your connection and try again, or open our RSVP form below.";
        statusEl.classList.add("is-error");
      })
      .finally(function () {
        clearTimeout(timeout);
        submitBtn.disabled = false;
        submitBtn.classList.remove("is-loading");
        submitBtn.querySelector(".btn__text").textContent = "Send with love";
      });
  });

  againBtn.addEventListener("click", function () {
    form.reset();
    otherWrap.hidden = true;
    updateInvitedHint();
    ["fullName", "attendance", "guests", "guestsOther"].forEach(clearError);
    statusEl.textContent = "";
    submitBtn.disabled = false;
    submitBtn.classList.remove("is-loading");
    submitBtn.querySelector(".btn__text").textContent = "Send with love";
    statusEl.classList.remove("is-error");
    thanks.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    form.fullName.focus({ preventScroll: true });
  });
})();
