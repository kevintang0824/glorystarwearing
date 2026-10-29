document.addEventListener("DOMContentLoaded", () => {
  const shellHeader = document.querySelector(".site-header:not(.site-header--catalog-showcase)");
  const shellNavigation = shellHeader?.querySelector(".nav-links");
  if (shellNavigation) shellHeader.classList.add("site-header--unified");
  // Localized HTML already has authored labels and same-language routes.
  // Rebuilding it from the English menu silently sent buyers out of their locale.
  if (shellNavigation && /^en(?:-|$)/i.test(document.documentElement.lang)) {
    const existingQuoteHref = shellNavigation.querySelector(".button")?.getAttribute("href") || "/request-a-quote/";
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const shellLinks = [
      { label: "Home", href: "/", match: (path) => path === "/" },
      { label: "Products", href: "/products/", match: (path) => path === "/products" || path.startsWith("/products/") },
      { label: "Customize Service", href: "/private-label-activewear/", match: (path) => path === "/private-label-activewear" || path === "/custom-activewear-process" || path === "/activewear-branding-guide" },
      { label: "About Us", href: "/about-glory-star-wear/", match: (path) => path === "/about-glory-star-wear" },
      { label: "Support", href: "/support/", match: (path) => [
        "/support",
        "/faq",
        "/activewear-manufacturing-guides",
        "/activewear-moq-sampling",
        "/activewear-fabrics",
        "/activewear-quality-control",
        "/activewear-shipping-guide",
        "/activewear-manufacturer-selection-checklist",
      ].includes(path) },
      { label: "Contact Us", href: "/contact-us/", match: (path) => path === "/contact-us" },
    ];

    const fragment = document.createDocumentFragment();
    shellLinks.forEach(({ label, href, match }) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      if (match(currentPath)) link.setAttribute("aria-current", "page");
      fragment.appendChild(link);
    });
    const quote = document.createElement("a");
    quote.className = "button";
    quote.href = existingQuoteHref;
    quote.textContent = "Request a quote";
    if (currentPath === "/request-a-quote") quote.setAttribute("aria-current", "page");
    fragment.appendChild(quote);
    shellNavigation.replaceChildren(fragment);
    shellHeader.classList.add("site-header--unified");
  }

  document.querySelectorAll("[data-analytics-event]").forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof window.gtag !== "function") return;
      window.gtag("event", link.dataset.analyticsEvent, {
        method: link.dataset.analyticsMethod || undefined,
        link_url: link.href,
        link_text: link.textContent.replace(/\s+/g, " ").trim().slice(0, 100),
        page_path: window.location.pathname,
      });
    });
  });

  const query = new URLSearchParams(window.location.search);
  const safeParam = (name, maximum) => (query.get(name) || "").replace(/\s+/g, " ").trim().slice(0, maximum);
  const interest = safeParam("interest", 80);
  const productSku = safeParam("sku", 80);
  const productName = safeParam("product", 160);
  const requestedSource = safeParam("source", 220);
  const productSource = /^\/products\/[a-z0-9-]+\/$/.test(requestedSource)
    ? new URL(requestedSource, window.location.origin).href
    : "";
  const interestField = document.querySelector('[data-field="interest"]');
  if (interestField && interest && [...interestField.options].some((option) => option.value === interest)) {
    interestField.value = interest;
  }

  const productContext = document.querySelector("[data-product-context]");
  if (productContext && (productName || productSku)) {
    const contextName = productContext.querySelector("[data-product-context-name]");
    const contextLink = productContext.querySelector("[data-product-context-link]");
    if (contextName) contextName.textContent = [productName, productSku && `SKU ${productSku}`].filter(Boolean).join(" · ");
    if (contextLink && productSource) contextLink.href = productSource;
    else if (contextLink) contextLink.hidden = true;
    productContext.hidden = false;
  }

  document.querySelectorAll("form[data-whatsapp-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (form.dataset.submitting === "true") return;
      form.dataset.submitting = "true";
      const submitButton = form.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
      }
      const releaseForm = () => {
        form.dataset.submitting = "false";
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute("aria-busy");
        }
      };

      const lines = ["Hello Glory Star Wear, I would like to request a custom activewear quote.", ""];
      if (productName) lines.push(`Product: ${productName}`);
      if (productSku) lines.push(`SKU: ${productSku}`);
      if (productSource) lines.push(`Product page: ${productSource}`);
      if (productName || productSku || productSource) lines.push("");
      form.querySelectorAll("input[data-field], select[data-field], textarea[data-field]").forEach((field) => {
        if ((field.type === "checkbox" || field.type === "radio") && !field.checked) return;
        const value = field.options ? field.options[field.selectedIndex]?.text : field.value.trim();
        if (value) lines.push(`${field.dataset.label || field.name}: ${value}`);
      });
      lines.push("", `Inquiry page: ${window.location.href.split("?")[0]}`);

      if (typeof window.gtag === "function") {
        // Opening a draft is not the same as sending an inquiry. Record the
        // channel action without inflating the confirmed-lead conversion.
        window.gtag("event", "whatsapp_draft_opened", {
          method: "whatsapp",
          form_name: "request_quote",
          product_interest: interestField?.value || "unspecified",
          product_sku: productSku || "unspecified",
          page_path: window.location.pathname,
        });
      }

      const number = form.dataset.whatsappNumber || "8618020755949";
      const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
      const whatsappWindow = window.open("", "_blank");
      if (whatsappWindow) {
        whatsappWindow.opener = null;
        whatsappWindow.location.replace(whatsappUrl);
        window.setTimeout(releaseForm, 2500);
      } else {
        window.location.assign(whatsappUrl);
      }
    });
  });
});
