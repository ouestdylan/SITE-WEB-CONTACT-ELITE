(function () {
  "use strict";

  /* ---------- 1. Forcer le HTTPS (filet de sécurité côté client) ---------- */
  if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
    window.location.replace("https:" + window.location.href.substring(window.location.protocol.length));
  }

  /* ---------- 2. Menu mobile ---------- */
  var menuToggle = document.getElementById("menuToggle");
  var primaryNav = document.getElementById("primaryNav");
  function closeMenu() {
    if (!primaryNav) return;
    primaryNav.classList.remove("open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  }
  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", function () {
      var open = primaryNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    primaryNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }

  /* ---------- 3. Bandeau cookies (persiste sur toutes les pages) ---------- */
  var CONSENT_KEY = "contact-elite-cookie-consent";
  var banner = document.getElementById("cookieBanner");
  var details = document.getElementById("cookieDetails");
  var analyticsToggle = document.getElementById("cookieAnalyticsToggle");
  var saveCustomBtn = document.getElementById("cookieSaveCustom");

  function readConsent() {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); }
    catch (e) { return null; }
  }
  function writeConsent(analytics) {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics: !!analytics, date: new Date().toISOString() }));
    } catch (e) { }
    if (banner) banner.classList.remove("show");
    if (analytics) initAnalytics();
  }

  if (banner) {
    var existing = readConsent();
    if (!existing) { banner.classList.add("show"); }
    else if (existing.analytics) { initAnalytics(); }

    var acceptAll = document.getElementById("cookieAcceptAll");
    var refuseAll = document.getElementById("cookieRefuseAll");
    var customize = document.getElementById("cookieCustomize");
    var openPrefs = document.getElementById("openCookiePrefs");

    if (acceptAll) acceptAll.addEventListener("click", function () { writeConsent(true); });
    if (refuseAll) refuseAll.addEventListener("click", function () { writeConsent(false); });
    if (customize) customize.addEventListener("click", function () {
      details.classList.toggle("show");
      saveCustomBtn.style.display = details.classList.contains("show") ? "inline-flex" : "none";
    });
    if (saveCustomBtn) saveCustomBtn.addEventListener("click", function () { writeConsent(analyticsToggle.checked); });
    if (openPrefs) openPrefs.addEventListener("click", function () {
      var c = readConsent();
      if (c && analyticsToggle) analyticsToggle.checked = !!c.analytics;
      banner.classList.add("show");
      details.classList.add("show");
      saveCustomBtn.style.display = "inline-flex";
    });
  }

  /* ---------- 4. Analytics léger, activé uniquement après consentement -----
     Une fois le site déployé sur son propre nom de domaine, remplacez
     initAnalytics() par le script fourni par votre outil d'analyse
     (Plausible, GA4...), chargé uniquement ici — donc uniquement après
     consentement, sur chaque page qui inclut ce fichier. */
  var analyticsReady = false;
  function initAnalytics() {
    if (analyticsReady) return;
    analyticsReady = true;
    try {
      var n = parseInt(localStorage.getItem("contact-elite-pageviews") || "0", 10);
      localStorage.setItem("contact-elite-pageviews", String(n + 1));
    } catch (e) { }
  }
  document.querySelectorAll("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function () {
      if (!analyticsReady) return;
      try {
        var clicks = parseInt(localStorage.getItem("contact-elite-cta-clicks") || "0", 10);
        localStorage.setItem("contact-elite-cta-clicks", String(clicks + 1));
      } catch (e) { }
    });
  });

  /* ---------- 5. Formulaire de contact : validation + anti-spam ---------- */
  var form = document.getElementById("contactForm");
  if (form) {
    var status = document.getElementById("formStatus");
    var loadedAt = Date.now();

    function setError(fieldId, msg) {
      var field = document.getElementById(fieldId);
      var err = field.querySelector(".error-msg");
      if (msg) { field.classList.add("invalid"); err.textContent = msg; }
      else { field.classList.remove("invalid"); err.textContent = ""; }
    }

    function validate(data) {
      var ok = true;
      if (!data.name || data.name.trim().length < 2) {
        setError("field-name", "Merci d'indiquer votre nom."); ok = false;
      } else setError("field-name", "");

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "");
      if (!emailOk) {
        setError("field-email", "Adresse email invalide."); ok = false;
      } else setError("field-email", "");

      if (!data.message || data.message.trim().length < 10) {
        setError("field-message", "Votre message doit contenir au moins 10 caractères."); ok = false;
      } else setError("field-message", "");

      return ok;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.textContent = "";
      status.className = "form-status";

      var data = {
        name: document.getElementById("cf-name").value,
        email: document.getElementById("cf-email").value,
        message: document.getElementById("cf-message").value,
        website: document.getElementById("website").value
      };

      if (data.website) {
        status.textContent = "Merci, votre message a bien été envoyé.";
        status.className = "form-status ok";
        form.reset();
        return;
      }
      if (Date.now() - loadedAt < 1500) {
        status.textContent = "Merci de patienter un instant avant d'envoyer le formulaire.";
        status.className = "form-status err";
        return;
      }
      if (!validate(data)) {
        status.textContent = "Merci de corriger les champs indiqués ci-dessus.";
        status.className = "form-status err";
        return;
      }

      var submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      status.textContent = "Envoi en cours...";
      status.className = "form-status";

      /* Envoi du formulaire vers deux adresses email via FormSubmit
         (service gratuit, sans backend à héberher). La première fois,
         chaque adresse destinataire doit cliquer sur le lien de
         confirmation qu'elle reçoit par email pour activer la réception. */
      fetch("https://formsubmit.co/ajax/pro.stockinger@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: data.message,
          _subject: "Nouveau message — Contact Elite",
          _cc: "rubensportouch@gmail.com",
          _template: "table"
        })
      })
        .then(function (res) {
          if (!res.ok) throw new Error("bad-response");
          status.textContent = "Merci, votre message a bien été envoyé. Nous revenons vers vous sous 24 à 48h.";
          status.className = "form-status ok";
          form.reset();
        })
        .catch(function () {
          status.textContent = "L'envoi automatique n'est pas encore actif sur cet aperçu. Écrivez-nous directement à contact@contact-elite.fr.";
          status.className = "form-status err";
        })
        .finally(function () { submitBtn.disabled = false; });
    });
  }
})();
