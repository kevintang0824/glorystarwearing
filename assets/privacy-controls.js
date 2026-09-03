(() => {
  "use strict";

  const script = document.currentScript;
  const measurementId = script?.dataset.measurementId || "";
  const storageKey = "gsw_analytics_consent";
  const localeElement = document.getElementById("gsw-locale-data");
  const localeData = localeElement ? JSON.parse(localeElement.textContent) : null;
  let analyticsLoaded = false;
  let banner;

  const readChoice = () => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const saveChoice = (choice) => {
    try {
      window.localStorage.setItem(storageKey, choice);
    } catch {
      // The preference remains valid for the current page when storage is unavailable.
    }
  };

  const setConsent = (choice) => {
    if (typeof window.gtag !== "function") return;
    window.gtag("consent", "update", {
      analytics_storage: choice === "accepted" ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  };

  const loadAnalytics = () => {
    if (analyticsLoaded || !measurementId) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const analyticsScript = document.createElement("script");
    analyticsScript.async = true;
    analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(analyticsScript);
  };

  const hideBanner = () => {
    if (!banner) return;
    banner.hidden = true;
  };

  const choose = (choice) => {
    saveChoice(choice);
    if (choice === "accepted") loadAnalytics();
    else setConsent("declined");
    hideBanner();
  };

  const buildBanner = () => {
    if (banner) return banner;
    banner = document.createElement("section");
    banner.className = "privacy-choice";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Analytics cookie choices");
    banner.innerHTML = `
      <div class="privacy-choice__copy">
        <strong>Choose your analytics preference</strong>
        <p>Essential site functions do not require analytics. With your permission, we use Google Analytics to understand visits and improve the site. Read our <a href="/cookie-policy/">Cookie Notice</a> and <a href="/privacy-policy/">Privacy Policy</a>.</p>
      </div>
      <div class="privacy-choice__actions">
        <button type="button" data-cookie-decline>Decline analytics</button>
        <button type="button" class="privacy-choice__accept" data-cookie-accept>Accept analytics</button>
      </div>`;
    if (localeData?.privacy) {
      const copy = localeData.privacy;
      banner.setAttribute("aria-label", copy.title);
      banner.querySelector("strong").textContent = copy.title;
      const paragraph = banner.querySelector("p");
      paragraph.textContent = `${copy.text} `;
      for (const [route, label] of [["cookie-policy", localeData.ui.cookies], ["privacy-policy", localeData.ui.privacy]]) {
        const link = document.createElement("a");
        link.href = `${localeData.base}/${route}/`;
        link.textContent = label;
        paragraph.append(link, " ");
      }
      banner.querySelector("[data-cookie-decline]").textContent = copy.decline;
      banner.querySelector("[data-cookie-accept]").textContent = copy.accept;
    }
    banner.querySelector("[data-cookie-decline]").addEventListener("click", () => choose("declined"));
    banner.querySelector("[data-cookie-accept]").addEventListener("click", () => choose("accepted"));
    document.body.append(banner);
    return banner;
  };

  const showBanner = (moveFocus = false) => {
    const choiceBanner = buildBanner();
    choiceBanner.hidden = false;
    if (moveFocus) choiceBanner.querySelector("button")?.focus({ preventScroll: true });
  };

  const addStyles = () => {
    const style = document.createElement("style");
    style.textContent = `
      .privacy-choice{position:fixed;z-index:999999;left:18px;right:18px;bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:28px;max-width:1120px;margin:auto;padding:20px 22px;border:1px solid #4b4a46;border-radius:6px;background:#1d1d1b;color:#fff;box-shadow:0 16px 50px rgba(0,0,0,.28);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}
      .privacy-choice[hidden]{display:none}.privacy-choice strong{display:block;margin-bottom:4px;font-size:16px}.privacy-choice p{max-width:760px;margin:0;color:#dedbd5;font-size:14px}.privacy-choice a{color:#fff;text-decoration:underline;text-underline-offset:3px}.privacy-choice__actions{display:flex;flex:0 0 auto;gap:10px}.privacy-choice button{min-height:44px;padding:10px 15px;border:1px solid #fff;border-radius:4px;background:transparent;color:#fff;font:inherit;font-weight:750;cursor:pointer}.privacy-choice button:hover,.privacy-choice button:focus-visible{outline:2px solid #fff;outline-offset:2px}.privacy-choice .privacy-choice__accept{border-color:#df8268;background:#df8268}
      @media(max-width:760px){.privacy-choice{align-items:stretch;flex-direction:column;gap:16px}.privacy-choice__actions{display:grid;grid-template-columns:1fr 1fr}.privacy-choice button{width:100%}}
      @media(max-width:420px){.privacy-choice{left:10px;right:10px;bottom:10px;padding:17px}.privacy-choice__actions{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  };

  const init = () => {
    addStyles();
    const choice = readChoice();
    if (choice === "accepted") loadAnalytics();
    else if (choice !== "declined") showBanner();
    document.addEventListener("click", (event) => {
      const control = event.target.closest("[data-cookie-settings]");
      if (!control) return;
      event.preventDefault();
      showBanner(true);
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
