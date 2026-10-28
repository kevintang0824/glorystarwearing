(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 767px)");

  const slidesPerView = (carousel) => {
    if (carousel.closest(".elementor-element-d3b1ec3")) return mobile.matches ? 2 : 6;
    if (carousel.closest(".elementor-element-e7d62ed")) return mobile.matches ? 2 : 4;
    if (carousel.closest(".elementor-element-3d044f3")) return mobile.matches ? 2 : 5;
    return 1;
  };

  const setupCarousel = (carousel) => {
    const wrapper = carousel.querySelector(":scope > .swiper-wrapper");
    const slides = wrapper ? [...wrapper.children] : [];
    if (!wrapper || !slides.length) return;

    const host = carousel.closest(".elementor-widget-container") || carousel.parentElement;
    const previous = host.querySelector(".elementor-swiper-button-prev, .swiper-button-prev");
    const next = host.querySelector(".elementor-swiper-button-next, .swiper-button-next");
    const pagination = carousel.querySelector(":scope > .swiper-pagination");
    let index = 0;
    let timer;

    const update = () => {
      const visible = slidesPerView(carousel);
      const max = Math.max(0, slides.length - visible);
      if (index > max) index = 0;
      if (index < 0) index = max;
      wrapper.style.transform = `translate3d(-${(index * 100) / visible}%, 0, 0)`;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex >= index && slideIndex < index + visible;
        slide.setAttribute("aria-hidden", String(!active));
      });
      [previous, next].forEach((button) => {
        if (!button) return;
        button.classList.toggle("swiper-button-disabled", max === 0);
        button.setAttribute("aria-disabled", String(max === 0));
      });
      if (pagination) {
        const pages = Math.max(1, max + 1);
        pagination.innerHTML = "";
        for (let page = 0; page < pages; page += 1) {
          const bullet = document.createElement("button");
          bullet.type = "button";
          bullet.className = "swiper-pagination-bullet";
          bullet.setAttribute("aria-label", `Go to slide ${page + 1}`);
          bullet.setAttribute("aria-current", String(page === index));
          bullet.addEventListener("click", () => {
            index = page;
            update();
          });
          pagination.appendChild(bullet);
        }
      }
    };

    const move = (direction) => {
      const visible = slidesPerView(carousel);
      const max = Math.max(0, slides.length - visible);
      if (!max) return;
      index += direction;
      if (index > max) index = 0;
      if (index < 0) index = max;
      update();
    };

    previous?.addEventListener("click", () => move(-1));
    next?.addEventListener("click", () => move(1));
    window.addEventListener("resize", update, { passive: true });
    update();

    if (!prefersReducedMotion.matches && slides.length > slidesPerView(carousel)) {
      const restart = () => {
        window.clearInterval(timer);
        timer = window.setInterval(() => move(1), 5000);
      };
      carousel.addEventListener("mouseenter", () => window.clearInterval(timer));
      carousel.addEventListener("mouseleave", restart);
      carousel.addEventListener("focusin", () => window.clearInterval(timer));
      carousel.addEventListener("focusout", restart);
      restart();
    }
  };

  const setupCounters = () => {
    document.querySelectorAll(".elementor-counter-number[data-to-value]").forEach((counter) => {
      counter.textContent = Number(counter.dataset.toValue).toLocaleString();
    });
  };

  const setupModal = () => {
    const modal = document.getElementById("modal-12667");
    if (!modal) return;
    const parent = modal.closest(".uael-modal-parent-wrapper");
    const overlay = parent?.querySelector(".uael-overlay");
    const close = parent?.querySelector(".uael-modal-close");
    const triggers = document.querySelectorAll(".uael-trigger[data-modal='12667']");
    let lastFocused;

    const hide = () => {
      modal.classList.remove("uael-show");
      modal.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("uael-modal-open");
      lastFocused?.focus?.();
    };
    const show = (event) => {
      event?.preventDefault();
      lastFocused = document.activeElement;
      modal.classList.add("uael-show");
      modal.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("uael-modal-open");
      close?.focus();
    };

    triggers.forEach((trigger) => trigger.addEventListener("click", show));
    close?.addEventListener("click", hide);
    overlay?.addEventListener("click", hide);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("uael-show")) hide();
    });
  };

  const init = () => {
    document.querySelectorAll(".qodef-qi-swiper-container, .elementor-main-swiper, .e-n-carousel")
      .forEach(setupCarousel);
    setupCounters();
    setupModal();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
