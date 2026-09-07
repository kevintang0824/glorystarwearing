(function () {
  "use strict";

  const PAGE_SIZE = 24;
  const localeData = (() => {
    try { return JSON.parse(document.getElementById("gsw-locale-data")?.textContent || "{}"); }
    catch { return {}; }
  })();
  const catalogCopy = localeData.interface?.catalog || {};
  const routePrefix = (() => {
    const feed = document.querySelector("[data-catalog]")?.dataset.catalogFeed || "";
    const match = feed.match(/^\/(fr|es|pt|ru|zh-cn)\/products\//i);
    return match ? `/${match[1]}` : "";
  })();
  const validProductRoute = (route) => new RegExp(`^${routePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/products/[a-z0-9-]+/$`, "i").test(route || "");
  const formatStatus = (template, values) => String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

  const normalize = (value) =>
    String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const normalizeCategory = (value) =>
    normalize(value)
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-");

  const categoryTokens = (item) =>
    String(item.dataset.categories || item.dataset.category || "")
      .split(/[,|]/)
      .map(normalizeCategory)
      .filter(Boolean);

  const searchableText = (item) =>
    normalize(
      [
        item.dataset.title,
        item.dataset.name,
        item.dataset.sku,
        item.dataset.category,
        item.dataset.categories,
        item.textContent,
      ].join(" ")
    );

  const setCategoryParameter = (value) => {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set("category", value);
    } else {
      url.searchParams.delete("category");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const enhanceCatalog = (catalog) => {
    const search = catalog.querySelector("[data-catalog-search]");
    const category = catalog.querySelector("[data-catalog-category]");
    const filters = Array.from(catalog.querySelectorAll("[data-catalog-filter]"));
    const sidebarLabel = catalog.querySelector("[data-catalog-sidebar-label]");
    const status = catalog.querySelector("[data-catalog-status]");
    const more = catalog.querySelector("[data-catalog-more]");
    const grid = catalog.querySelector("#catalog-product-grid");
    let items = Array.from(catalog.querySelectorAll("[data-catalog-item]"));
    const empty = catalog.querySelector("[data-catalog-empty]");
    const defaultFilter = catalog.hasAttribute("data-catalog-default-filter")
      ? catalog.dataset.catalogDefaultFilter
      : filters[0]?.dataset.catalogFilter || "";
    const feedUrl = catalog.dataset.catalogFeed || "";
    const totalProducts = Number(catalog.dataset.catalogTotal || items.length);

    if (!items.length) return;

    let visibleLimit = more ? PAGE_SIZE : Number.POSITIVE_INFINITY;
    let matches = items;
    let selectedValue = category ? category.value || defaultFilter : defaultFilter;
    let allItemsLoaded = items.length >= totalProducts;
    let loadPromise;
    let products = [];

    const prepareItems = () => {
      items.forEach((item) => {
        item.__catalogSearchText = searchableText(item);
        item.__catalogCategories = categoryTokens(item);
      });
    };
    prepareItems();

    const createCatalogItem = (product) => {
      if (!product || !validProductRoute(product.route) ||
          !/^\/(?:wp-content\/uploads\/catalog|assets)\//.test(product.image?.path || "")) return null;
      const item = document.createElement("article");
      item.className = "catalog-card";
      item.dataset.catalogItem = "";
      item.dataset.category = Array.isArray(product.groups) ? product.groups.join(",") : "";
      item.dataset.search = [product.title, product.sku, ...(product.pills || [])].join(" ").toLowerCase();

      const link = document.createElement("a");
      link.className = "catalog-card__link";
      link.href = product.route;
      const media = document.createElement("div");
      media.className = "catalog-card__media";
      const image = document.createElement("img");
      image.loading = "lazy";
      image.decoding = "async";
      image.src = product.image.path;
      image.width = Number(product.image.width) || 900;
      image.height = Number(product.image.height) || 900;
      image.alt = product.image.alt || `${product.title} – product view`;
      const badge = document.createElement("span");
      badge.className = "catalog-card__badge";
      badge.textContent = product.mediaReview ? (catalogCopy.imageReview || "Image review") : product.primaryLabel;
      media.append(image, badge);

      const body = document.createElement("div");
      body.className = "catalog-card__body";
      const meta = document.createElement("p");
      meta.className = "catalog-card__meta";
      for (const value of [product.primaryLabel, product.sku]) {
        const span = document.createElement("span");
        span.textContent = value || "";
        meta.append(span);
      }
      const title = document.createElement("h2");
      title.className = "catalog-card__title";
      title.textContent = product.title || "Activewear style";
      const arrow = document.createElement("span");
      arrow.className = "catalog-card__arrow";
      arrow.textContent = catalogCopy.view || "View style";
      body.append(meta, title, arrow);
      link.append(media, body);
      item.append(link);
      return item;
    };

    const loadAllItems = () => {
      if (allItemsLoaded) return Promise.resolve();
      if (loadPromise) return loadPromise;
      loadPromise = fetch(feedUrl, { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`Catalog feed returned ${response.status}`);
          return response.json();
        })
        .then((feedProducts) => {
          if (!Array.isArray(feedProducts) || feedProducts.length !== totalProducts) throw new Error("Catalog feed count mismatch");
          products = feedProducts.map((product) => ({
            ...product,
            __catalogSearchText: normalize([product.title, product.sku, ...(product.pills || [])].join(" ")),
            __catalogCategories: Array.isArray(product.groups) ? product.groups.map(normalizeCategory) : [],
          }));
          if (products.some((product) => !validProductRoute(product.route) ||
              !/^\/(?:wp-content\/uploads\/catalog|assets)\//.test(product.image?.path || ""))) {
            throw new Error("Catalog feed contains an invalid product record");
          }
          allItemsLoaded = true;
        })
        .catch((error) => {
          loadPromise = undefined;
          if (status) status.textContent = catalogCopy.fullCatalogError || "The full catalog could not be loaded. Use the complete catalog index below.";
          throw error;
        });
      return loadPromise;
    };

    if (status) {
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
    }

    if (more) {
      if (more.tagName === "BUTTON") more.setAttribute("type", "button");
    }

    const validCategoryValue = (requested) => {
      if (!requested) return "";
      const options = category ? Array.from(category.options || []) : [];
      const filterValues = filters.map((filter) => filter.dataset.catalogFilter || "");
      const directMatch = options.find((option) => option.value === requested);
      if (directMatch) return directMatch.value;
      if (filterValues.includes(requested)) return requested;
      const requestedNormalized = normalizeCategory(requested);
      const normalizedMatch = options.find(
        (option) => normalizeCategory(option.value) === requestedNormalized
      );
      if (normalizedMatch) return normalizedMatch.value;
      return filterValues.find((value) => normalizeCategory(value) === requestedNormalized) || "";
    };

    const syncFilterUI = () => {
      filters.forEach((filter) => {
        const isActive = (filter.dataset.catalogFilter || "") === selectedValue;
        filter.classList.toggle("is-active", isActive);
        filter.setAttribute("aria-pressed", String(isActive));
      });
      if (category && category.value !== selectedValue) category.value = selectedValue;
      if (sidebarLabel) {
        const active = filters.find((filter) => (filter.dataset.catalogFilter || "") === selectedValue);
        sidebarLabel.textContent = active ? active.querySelector("span")?.textContent || "Product Categories" : "Product Categories";
        if (active && active.tagName !== "SUMMARY") {
          const activeGroup = active.closest(".catalog-sidebar__group");
          catalog.querySelectorAll(".catalog-sidebar__group[open]").forEach((group) => {
            if (group !== activeGroup) group.removeAttribute("open");
          });
          activeGroup?.setAttribute("open", "");
        }
      }
    };

    const update = ({ announce = true, updateUrl = false } = {}) => {
      const query = normalize(search ? search.value : "");
      const queryTerms = query.split(/\s+/).filter(Boolean);
      const selected = normalizeCategory(selectedValue);

      if (allItemsLoaded) {
        matches = products.filter((product) => {
          const queryMatches = queryTerms.every((term) => product.__catalogSearchText.includes(term));
          const categoryMatches = !selected || product.__catalogCategories.includes(selected);
          return queryMatches && categoryMatches;
        });
        const fragment = document.createDocumentFragment();
        matches.slice(0, visibleLimit).forEach((product) => fragment.append(createCatalogItem(product)));
        grid?.replaceChildren(fragment);
        items = Array.from(catalog.querySelectorAll("[data-catalog-item]"));
      } else {
        matches = items.filter((item) => {
          const queryMatches = queryTerms.every((term) => item.__catalogSearchText.includes(term));
          const categoryMatches = !selected || item.__catalogCategories.includes(selected);
          return queryMatches && categoryMatches;
        });
        const visibleItems = new Set(matches.slice(0, visibleLimit));
        items.forEach((item) => {
          item.hidden = !visibleItems.has(item);
        });
      }

      const reportedMatches = !allItemsLoaded && !query && !selected ? totalProducts : matches.length;
      const visibleCount = Math.min(visibleLimit, matches.length);

      if (empty) empty.hidden = reportedMatches !== 0;

      if (more) {
        const remaining = Math.max(0, reportedMatches - visibleCount);
        more.hidden = remaining === 0;
        if ("disabled" in more) more.disabled = remaining === 0;
        more.setAttribute("aria-disabled", String(remaining === 0));
        more.setAttribute(
          "aria-label",
          remaining
            ? `Load ${Math.min(PAGE_SIZE, remaining)} more products. ${remaining} remaining.`
            : "All matching products are shown."
        );
      }

      catalog.style.setProperty(
        "--catalog-progress",
        reportedMatches ? `${Math.round((visibleCount / reportedMatches) * 100)}%` : "0%"
      );

      if (status) {
        if (!reportedMatches) {
          status.textContent = catalogCopy.noProducts || "No products found. Try a different search or category.";
        } else if (visibleCount < reportedMatches) {
          status.textContent = formatStatus(catalogCopy.found || "{total} products found. Showing {visible}.", {total: reportedMatches, visible: visibleCount});
        } else {
          status.textContent = formatStatus(catalogCopy.all || "{total} products found. Showing all.", {
            total: reportedMatches,
            word: reportedMatches === 1 ? (catalogCopy.wordProduct || "product") : (catalogCopy.wordProducts || "products"),
          });
        }

        if (!announce) status.removeAttribute("aria-live");
        window.requestAnimationFrame(() => {
          status.setAttribute("aria-live", "polite");
        });
      }

      if (updateUrl) setCategoryParameter(selectedValue);
      syncFilterUI();
    };

    const resetAndUpdate = async (updateUrl) => {
      await loadAllItems();
      visibleLimit = PAGE_SIZE;
      update({ updateUrl });
    };

    const initializeFromUrl = () => {
      const requested = new URL(window.location.href).searchParams.get("category");
      const initialValue = requested ? validCategoryValue(requested) : validCategoryValue(defaultFilter);
      selectedValue = initialValue;
      if (category) category.value = initialValue;
    };

    initializeFromUrl();
    catalog.classList.add("is-enhanced");
    if (selectedValue) resetAndUpdate(false).catch(() => {});
    else update({ announce: false });
    items.forEach((item) => item.classList.remove("catalog-card--deferred"));

    if (search) {
      search.addEventListener("input", () => resetAndUpdate(false).catch(() => {}));
      search.addEventListener("search", () => resetAndUpdate(false).catch(() => {}));
    }

    if (category) {
      category.addEventListener("change", async () => {
        selectedValue = category.value;
        await resetAndUpdate(true).catch(() => {});
      });
    }

    filters.forEach((filter) => {
      filter.addEventListener("click", async () => {
        if (filter.tagName === "SUMMARY") {
          const group = filter.closest(".catalog-sidebar__group");
          if (group && !group.open) {
            catalog.querySelectorAll(".catalog-sidebar__group[open]").forEach((openGroup) => {
              if (openGroup !== group) openGroup.removeAttribute("open");
            });
          }
        }
        selectedValue = filter.dataset.catalogFilter || "";
        await resetAndUpdate(true).catch(() => {});
      });
    });

    if (more) {
      more.addEventListener("click", async (event) => {
        event.preventDefault();
        await loadAllItems().catch(() => {});
        if (!allItemsLoaded) return;
        visibleLimit += PAGE_SIZE;
        update();
      });
    }

    window.addEventListener("popstate", () => {
      const requested = new URL(window.location.href).searchParams.get("category");
      selectedValue = requested ? validCategoryValue(requested) : validCategoryValue(defaultFilter);
      if (category) category.value = selectedValue;
      resetAndUpdate(false).catch(() => {});
    });
  };

  const init = () => {
    document.querySelectorAll("[data-catalog]").forEach(enhanceCatalog);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
