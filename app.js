const STORAGE_KEY = "usedmarket_ads_v1";
const THEME_KEY = "usedmarket_theme";

const routes = {
  "": renderHome,
  "#/": renderHome,
  "#/new": renderNewAd,
  "#/ad": renderAdDetails,
  "#/account": renderAccount,
  "#/messages": renderMessages,
};

let ads = [];

function loadAds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    ads = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ads)) ads = [];
  } catch (e) {
    ads = [];
  }
}

function renderAccount() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="page" aria-labelledby="account-title">
      <div class="page__header">
        <div>
          <h1 id="account-title" class="page__title">Личный кабинет</h1>
          <p class="page__subtitle">Здесь отображаются объявления, сохранённые в вашем браузере.</p>
        </div>
        <div class="page__actions">
          <button class="btn btn--ghost" data-link="back">Назад</button>
        </div>
      </div>

      <div>
        <p>Всего объявлений: <strong>${ads.length}</strong></p>
        <div id="account-ads-list" class="grid"></div>
        <div style="margin-top:12px; display:flex; gap:8px;">
          <button id="export-ads" class="btn btn--ghost">Экспортировать (console)</button>
          <button id="clear-ads" class="btn btn--danger">Очистить мои объявления</button>
        </div>
      </div>
    </section>
  `;

  const backBtn = app.querySelector('[data-link="back"]');
  if (backBtn) backBtn.addEventListener("click", () => navigateTo("#/"));

  const container = document.getElementById("account-ads-list");
  const template = document.getElementById("card-template");

  (ads || []).forEach((item) => {
    const clone = document.importNode(template.content, true);
    const article = clone.querySelector(".card");
    const img = clone.querySelector(".card__image");
    const title = clone.querySelector(".card__title");
    const price = clone.querySelector(".card__price");

    img.src = (item.images && item.images[0]) || getPlaceholderImage();
    title.textContent = item.title;
    price.textContent = formatPrice(item.price);

    // delete action on click-hold: simple way to remove from account
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn--ghost";
    removeBtn.style.marginTop = "8px";
    removeBtn.textContent = "Удалить";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!confirm("Удалить это объявление?")) return;
      ads = ads.filter((x) => x.id !== item.id);
      saveAds();
      renderAccount();
    });

    const body = clone.querySelector('.card__body');
    body.appendChild(removeBtn);

    container.appendChild(clone);
  });

  const exportBtn = document.getElementById("export-ads");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      console.log(JSON.stringify(ads, null, 2));
      alert('Объявления выведены в консоль разработчика.');
    });
  }

  const clearBtn = document.getElementById("clear-ads");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!confirm("Удалить ВСЕ объявления? Это действие необратимо.")) return;
      ads = [];
      saveAds();
      renderAccount();
    });
  }
}

function renderMessages() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="page" aria-labelledby="messages-title">
      <div class="page__header">
        <div>
          <h1 id="messages-title" class="page__title">Сообщения</h1>
          <p class="page__subtitle">Здесь будут ваши сообщения (демо — функционал заглушка).</p>
        </div>
        <div class="page__actions">
          <button class="btn btn--ghost" data-link="back">Назад</button>
        </div>
      </div>
      <div>
        <p class="page__subtitle">Нет сообщений. Это демонстрационный интерфейс.</p>
      </div>
    </section>
  `;
  app.querySelector('[data-link="back"]').addEventListener("click", () => navigateTo("#/"));
}

function saveAds() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ads));
}

function loadTheme() {
  const cached = localStorage.getItem(THEME_KEY);
  const html = document.documentElement;
  if (cached === "light" || cached === "dark") {
    html.setAttribute("data-theme", cached);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    html.setAttribute("data-theme", "light");
  } else {
    html.setAttribute("data-theme", "dark");
  }
  updateThemeToggleIcon();
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem(THEME_KEY, next);
  updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const theme = document.documentElement.getAttribute("data-theme") || "dark";
  btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });
}

function formatCategory(cat) {
  const map = {
    electronics: "Электроника",
    fashion: "Одежда и обувь",
    home: "Дом и быт",
    auto: "Авто",
    other: "Другое",
  };
  return map[cat] || "Без категории";
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function currentPath() {
  const hash = window.location.hash || "#/";
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  return { path, params };
}

function navigateTo(path, extraParams) {
  const url = new URL(window.location.href);
  url.hash = path;
  if (extraParams) {
    const query = new URLSearchParams(extraParams);
    url.hash = `${path}?${query.toString()}`;
  }
  window.location.replace(url.toString());
}

function render() {
  const { path, params } = currentPath();
  const handler = routes[path] || renderNotFound;
  handler(params);
}

function applySearchAndSort(list) {
  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");

  const query = (searchInput?.value || "").trim().toLowerCase();
  const category = categorySelect?.value || "";
  const sort = sortSelect?.value || "";

  let filtered = list.slice();

  if (query) {
    filtered = filtered.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      return title.includes(query) || desc.includes(query);
    });
  }

  if (category) {
    filtered = filtered.filter((item) => item.category === category);
  }

  if (sort === "price-asc") {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sort === "price-desc") {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  return filtered;
}

function renderHome() {
  const app = document.getElementById("app");
  const list = applySearchAndSort(ads);

  app.innerHTML = `
    <section class="page" aria-labelledby="home-title">
      <div class="page__header">
        <div>
          <h1 id="home-title" class="page__title">Объявления</h1>
          <p class="page__subtitle">
            Покупайте и продавайте подержанные вещи в пару кликов.
          </p>
        </div>
        <div class="page__actions">
          <button class="btn btn--ghost" data-link="new">
            + Новое объявление
          </button>
        </div>
      </div>
      ${
        list.length === 0
          ? `
        <div class="empty">
          Пока нет ни одного объявления. Добавьте первое с помощью кнопки «Новое объявление».
        </div>
      `
          : `<div class="grid" id="cards-container"></div>`
      }
    </section>
  `;

  const createBtn = app.querySelector('[data-link="new"]');
  if (createBtn) {
    createBtn.addEventListener("click", () => navigateTo("#/new"));
  }

  if (list.length > 0) {
    const container = document.getElementById("cards-container");
    const template = document.getElementById("card-template");

    list.forEach((item) => {
      const clone = document.importNode(template.content, true);
      const article = clone.querySelector(".card");
      const img = clone.querySelector(".card__image");
      const title = clone.querySelector(".card__title");
      const price = clone.querySelector(".card__price");
      const category = clone.querySelector(".card__category");
      const description = clone.querySelector(".card__description");

      img.src = (item.images && item.images[0]) || getPlaceholderImage();
      title.textContent = item.title;
      price.textContent = formatPrice(item.price);
      category.textContent = formatCategory(item.category);
      description.textContent = item.description || "";

      const openDetails = () => {
        navigateTo("#/ad", { id: item.id });
      };

      article.addEventListener("click", openDetails);
      article.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetails();
        }
      });

      container.appendChild(clone);
    });
  }
}

function renderNewAd(params) {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="page" aria-labelledby="new-title">
      <div class="page__header">
        <div>
          <h1 id="new-title" class="page__title">Новое объявление</h1>
          <p class="page__subtitle">Заполните информацию о товаре и добавьте фото.</p>
        </div>
        <div class="page__actions">
          <button class="btn btn--ghost" data-link="back">Назад к списку</button>
        </div>
      </div>

      <form class="form" id="ad-form" novalidate>
        <div class="form__row">
          <label class="form__label" for="title">
            Заголовок <span>*</span>
          </label>
          <input id="title" name="title" class="form__input" required
            placeholder="Например, iPhone 12 128GB"/>
          <div class="form__error" data-error-for="title"></div>
        </div>

        <div class="form__row">
          <label class="form__label" for="category">
            Категория <span>*</span>
          </label>
          <select id="category" name="category" class="form__select" required>
            <option value="">Выберите категорию</option>
            <option value="electronics">Электроника</option>
            <option value="fashion">Одежда и обувь</option>
            <option value="home">Дом и быт</option>
            <option value="auto">Авто</option>
            <option value="other">Другое</option>
          </select>
          <div class="form__error" data-error-for="category"></div>
        </div>

        <div class="form__row">
          <label class="form__label" for="price">
            Цена, ₽ <span>*</span>
          </label>
          <input id="price" name="price" class="form__input" type="number" min="0" step="1" required
            placeholder="Введите цену"/>
          <div class="form__error" data-error-for="price"></div>
        </div>

        <div class="form__row">
          <label class="form__label" for="description">
            Описание <span>*</span>
          </label>
          <textarea id="description" name="description" class="form__textarea" required
            placeholder="Опишите состояние товара, комплектацию и условия передачи"></textarea>
          <div class="form__error" data-error-for="description"></div>
        </div>

        <div class="form__row">
          <label class="form__label" for="contact">
            Контакт (псевдоним или ник) <span>*</span>
          </label>
          <input id="contact" name="contact" class="form__input" required
            placeholder="Например, seller_42 или @nickname"/>
          <div class="form__error" data-error-for="contact"></div>
        </div>

        <div class="form__row">
          <label class="form__label" for="images">
            Фото товара
          </label>
          <input id="images" name="images" class="form__input" type="file" accept="image/*" multiple />
          <p class="form__hint">
            Можно загрузить несколько фото. В демо они сохраняются в Base64 в localStorage.
          </p>
          <div id="image-previews" class="grid"></div>
        </div>

        <div class="form__footer">
          <div class="form__footer-left">
            <span class="chip">Данные хранятся только в вашем браузере</span>
          </div>
          <div class="form__footer-right">
            <button type="button" class="btn btn--ghost" data-link="back">
              Отмена
            </button>
            <button type="submit" class="btn btn--primary">
              Опубликовать
            </button>
          </div>
        </div>
      </form>
    </section>
  `;

  app.querySelectorAll('[data-link="back"]').forEach((btn) =>
    btn.addEventListener("click", () => navigateTo("#/"))
  );

  const fileInput = document.getElementById("images");
  const previewContainer = document.getElementById("image-previews");
  const form = document.getElementById("ad-form");

  let imagesBase64 = [];

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      imagesBase64 = [];
      previewContainer.innerHTML = "";
      for (const file of files) {
        const dataUrl = await readFileAsDataURL(file);
        imagesBase64.push(dataUrl);
        const img = document.createElement("img");
        img.src = dataUrl;
        img.alt = "Фото товара";
        img.style.width = "100%";
        img.style.borderRadius = "12px";
        img.style.objectFit = "cover";
        img.style.maxHeight = "180px";
        const wrap = document.createElement("div");
        wrap.className = "card";
        wrap.style.padding = "4px";
        wrap.appendChild(img);
        previewContainer.appendChild(wrap);
      }
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const title = data.get("title").trim();
    const category = data.get("category");
    const priceRaw = data.get("price");
    const description = data.get("description").trim();
    const contact = data.get("contact").trim();

    clearErrors(form);

    let hasError = false;
    if (!title) {
      setError(form, "title", "Введите заголовок.");
      hasError = true;
    }
    if (!category) {
      setError(form, "category", "Выберите категорию.");
      hasError = true;
    }
    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) {
      setError(form, "price", "Введите корректную цену.");
      hasError = true;
    }
    if (!description) {
      setError(form, "description", "Добавьте описание.");
      hasError = true;
    }
    if (!contact) {
      setError(form, "contact", "Укажите контакт.");
      hasError = true;
    }

    if (hasError) return;

    const now = new Date();
    const ad = {
      id: generateId(),
      title,
      category,
      price,
      description,
      contact,
      images: imagesBase64.length ? imagesBase64 : [getPlaceholderImage()],
      createdAt: now.toISOString(),
    };

    ads.push(ad);
    saveAds();

    navigateTo("#/ad", { id: ad.id });
  });
}

function renderAdDetails(params) {
  const id = params.get("id");
  const ad = ads.find((x) => x.id === id);

  const app = document.getElementById("app");

  if (!ad) {
    app.innerHTML = `
      <section class="page">
        <div class="page__header">
          <div>
            <h1 class="page__title">Объявление не найдено</h1>
            <p class="page__subtitle">Возможно, оно было удалено или никогда не существовало.</p>
          </div>
          <div class="page__actions">
            <button class="btn btn--ghost" data-link="back">К списку объявлений</button>
          </div>
        </div>
      </section>
    `;
    app.querySelector('[data-link="back"]').addEventListener("click", () =>
      navigateTo("#/")
    );
    return;
  }

  app.innerHTML = `
    <section class="page" aria-labelledby="ad-title">
      <div class="page__header">
        <div>
          <h1 id="ad-title" class="page__title">${escapeHtml(ad.title)}</h1>
          <p class="page__subtitle">${formatCategory(ad.category)}</p>
        </div>
        <div class="page__actions">
          <button class="btn btn--ghost" data-link="back">Назад</button>
          <button class="btn btn--danger" data-action="delete">Удалить</button>
        </div>
      </div>

      <div class="details">
        <div class="details__main">
          <div class="gallery">
            <div class="gallery__main">
              <img id="gallery-main" src="${
                ad.images?.[0] || getPlaceholderImage()
              }" alt="Фото товара" />
            </div>
            <div class="gallery__thumbs" id="gallery-thumbs"></div>
          </div>

          <div>
            <div class="details__price">${formatPrice(ad.price)}</div>
            <div class="details__meta">
              <span>Категория: ${formatCategory(ad.category)}</span>
              <span>•</span>
              <span>ID: ${ad.id.slice(0, 8)}</span>
            </div>
            <div class="details__description">
              ${escapeHtml(ad.description).replace(/\n/g, "<br/>")}
            </div>
          </div>
        </div>

        <aside class="details__sidebar" aria-label="Контакты продавца">
          <div>
            <div class="details__contact-label">Продавец</div>
            <div class="details__contact-value">
              ${escapeHtml(ad.contact)}
            </div>
          </div>

          <div class="details__actions">
            <button class="btn btn--primary">Купить</button>
            <button class="btn btn--ghost">Написать продавцу</button>
          </div>

          <p class="details__note">
            Это демо-интерфейс. Реальных покупок и сообщений здесь нет, объявления хранятся только в вашем браузере.
          </p>
        </aside>
      </div>
    </section>
  `;

  const backBtn = app.querySelector('[data-link="back"]');
  if (backBtn) backBtn.addEventListener("click", () => navigateTo("#/"));

  const deleteBtn = app.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.addEventListener("click", () => {
      if (!confirm("Удалить это объявление?")) return;
      ads = ads.filter((x) => x.id !== ad.id);
      saveAds();
      navigateTo("#/");
    });
  }

  const thumbsContainer = document.getElementById("gallery-thumbs");
  const mainImg = document.getElementById("gallery-main");
  const template = document.getElementById("gallery-image-template");

  (ad.images || [getPlaceholderImage()]).forEach((src, index) => {
    const clone = document.importNode(template.content, true);
    const btn = clone.querySelector(".gallery__thumb");
    const img = clone.querySelector("img");
    img.src = src;
    if (index === 0) btn.classList.add("gallery__thumb--active");
    btn.addEventListener("click", () => {
      mainImg.src = src;
      thumbsContainer
        .querySelectorAll(".gallery__thumb")
        .forEach((el) => el.classList.remove("gallery__thumb--active"));
      btn.classList.add("gallery__thumb--active");
    });
    thumbsContainer.appendChild(clone);
  });
}

function renderNotFound() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <section class="page">
      <div class="page__header">
        <div>
          <h1 class="page__title">Страница не найдена</h1>
          <p class="page__subtitle">Попробуйте вернуться на главную.</p>
        </div>
        <div class="page__actions">
          <button class="btn btn--ghost" data-link="home">На главную</button>
        </div>
      </div>
    </section>
  `;
  app.querySelector('[data-link="home"]').addEventListener("click", () =>
    navigateTo("#/")
  );
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setError(form, name, message) {
  const el = form.querySelector(`[data-error-for="${name}"]`);
  if (el) el.textContent = message;
}

function clearErrors(form) {
  form.querySelectorAll("[data-error-for]").forEach((el) => {
    el.textContent = "";
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getPlaceholderImage() {
  return "data:image/svg+xml;base64," +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0b1220"/>
            <stop offset="100%" stop-color="#111827"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <circle cx="80" cy="60" r="40" fill="#ff4da6" fill-opacity="0.4"/>
        <circle cx="520" cy="320" r="80" fill="#00f0d1" fill-opacity="0.25"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          fill="#e6f7ff" fill-opacity="0.8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          font-size="22">Фото товара</text>
      </svg>`
    );
}

function setupHeaderEvents() {
  const header = document;
  header.querySelectorAll("[data-link='home']").forEach((btn) =>
    btn.addEventListener("click", () => navigateTo("#/"))
  );
  header.querySelectorAll("[data-link='new']").forEach((btn) =>
    btn.addEventListener("click", () => navigateTo("#/new"))
  );
  header.querySelectorAll("[data-link='account']").forEach((btn) =>
    btn.addEventListener("click", () => navigateTo("#/account"))
  );
  header.querySelectorAll("[data-link='messages']").forEach((btn) =>
    btn.addEventListener("click", () => navigateTo("#/messages"))
  );

  const searchForm = document.getElementById("search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => e.preventDefault());
  }

  const searchInput = document.getElementById("search-input");
  const categorySelect = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");

  [searchInput, categorySelect, sortSelect].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", () => {
      if (
        window.location.hash === "" ||
        window.location.hash.startsWith("#/")
      ) {
        renderHome();
      } else {
        navigateTo("#/");
      }
    });
    el.addEventListener("change", () => {
      if (
        window.location.hash === "" ||
        window.location.hash.startsWith("#/")
      ) {
        renderHome();
      } else {
        navigateTo("#/");
      }
    });
  });

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
}

window.addEventListener("hashchange", render);

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  loadAds();
  setupHeaderEvents();
  if (!window.location.hash) {
    navigateTo("#/");
  } else {
    render();
  }
});
