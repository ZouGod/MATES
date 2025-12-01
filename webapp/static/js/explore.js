/* ======================================================
   HELPER FUNCTIONS
====================================================== */
function el(sel) {
  return document.querySelector(sel);
}

function els(sel) {
  return Array.from(document.querySelectorAll(sel));
}

async function fetchJSON(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

/* ======================================================
   STATE MANAGEMENT
====================================================== */
let currentPage = 1;
let currentSort = "newest";
let currentPerPage = 20;
let lastApiResponse = null;

/* ======================================================
   COLLECT FILTER PARAMETERS
====================================================== */
function collectFilters() {
  const params = new URLSearchParams();

  const cats = els("#category-list input:checked").map(cb => cb.value).filter(v => v);
  if (cats.length > 0) params.append("category", cats[0]);

  const tags = els("#tag-list input:checked").map(cb => cb.value).filter(v => v);
  if (tags.length > 0) params.append("tag", tags.join(","));

  const sources = els("#source-list input:checked").map(cb => cb.value).filter(v => v);
  if (sources.length > 0) params.append("source", sources[0]);

  const startDate = el("#start-date")?.value;
  const endDate = el("#end-date")?.value;
  if (startDate) params.append("start", startDate);
  if (endDate) params.append("end", endDate);

  params.append("page", currentPage);
  params.append("per_page", currentPerPage);
  params.append("sort", currentSort);

  return params;
}

/* ======================================================
   RENDER ARTICLES (CARD UI)
====================================================== */
function renderArticles(data) {
  const container = el("#cards");
  const countEl = el("#count-articals");
  const countWordsEl = el("#count-words");
  const pageInfo = el("#page-info");

  if (!data || !container) return;

  lastApiResponse = data;

  // Update article count
  if (countEl) {
    countEl.textContent = `${data.total || 0} Articles`;
  }

  // Update word count
  if (countWordsEl && data.articles && data.articles.length > 0) {
    const totalWords = data.articles.reduce((sum, article) => {
      return sum + (article.character_count || 0);
    }, 0) / 5; // Divide by 5 for word estimate
    
    countWordsEl.textContent = `${Math.round(totalWords).toLocaleString()} Words`;
  }

  if (pageInfo) {
    pageInfo.textContent = `Page ${data.page || 1} of ${data.pages || 1}`;
  }

  container.innerHTML = "";

  if (!data.articles || data.articles.length === 0) {
    container.innerHTML = `<p class="text-gray-500 col-span-full text-center py-8">No results found.</p>`;
    updatePaginationButtons(data);
    return;
  }

  data.articles.forEach(a => {
    const card = document.createElement("article");
    card.className = "bg-white rounded-2xl border border-blue-100 shadow-sm p-6 hover:shadow-md transition";

    const categoryName = a.category?.category_name || "Uncategorized";
    const sourceName = a.source?.source_name || "Unknown";
    const sourceUrl = a.url || "#";
    const preview = (a.content || "").slice(0, 150) + "...";

    card.innerHTML = `
      <p class="text-xs font-semibold text-blue-700 uppercase mb-1">
        ${categoryName}
      </p>
      <h3 class="font-semibold text-gray-800 mb-2 line-clamp-2">
        ${a.title}
      </h3>
      <p class="text-sm text-gray-700 mb-3 line-clamp-2">
        ${preview}
      </p>
      <p class="text-sm text-gray-600 mb-3">${sourceName}</p>
      <div class="flex justify-between items-center text-sm text-gray-500 mt-4">
        <div class="flex flex-col space-y-1">
          <span>📅 ${a.publication_date || "N/A"}</span>
          <span>🔤 ${a.character_count || 0} chars</span>
        </div>
        <a
          href="${sourceUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
        >
          OPEN
        </a>
      </div>
    `;

    container.appendChild(card);
  });

  updatePaginationButtons(data);
}

/* ======================================================
   UPDATE PAGINATION BUTTONS
====================================================== */
function updatePaginationButtons(data) {
  const prevBtn = el("#prev-page");
  const nextBtn = el("#next-page");

  if (prevBtn) {
    prevBtn.style.pointerEvents = data.page <= 1 ? "none" : "auto";
    prevBtn.style.opacity = data.page <= 1 ? "0.5" : "1";
    prevBtn.onclick = e => {
      e.preventDefault();
      if (data.page > 1) {
        currentPage = data.page - 1;
        loadArticles();
      }
    };
  }

  if (nextBtn) {
    nextBtn.style.pointerEvents = data.page >= data.pages ? "none" : "auto";
    nextBtn.style.opacity = data.page >= data.pages ? "0.5" : "1";
    nextBtn.onclick = e => {
      e.preventDefault();
      if (data.page < data.pages) {
        currentPage = data.page + 1;
        loadArticles();
      }
    };
  }
}

/* ======================================================
   LOAD ARTICLES FROM API
====================================================== */
async function loadArticles() {
  const params = collectFilters();
  const url = `/api/articles?${params.toString()}`;

  console.log("Loading articles from:", url);
  const data = await fetchJSON(url);
  if (data) {
    renderArticles(data);
  }
}


/* ======================================================
   EXPORT FILTERED DATA
====================================================== */
function exportData(format = "json") {
  if (!lastApiResponse || !lastApiResponse.articles) {
    alert("No articles to export");
    return;
  }

  const articles = lastApiResponse.articles;

  if (format === "json") {
    exportJSON(articles);
  } else if (format === "csv") {
    exportCSV(articles);
  }
}

function exportJSON(articles) {
  const data = JSON.stringify(articles, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `articles_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(articles) {
  const headers = ["Title", "Content", "Category", "Source", "URL", "Publication Date"];
  const rows = articles.map(a => [
    `"${(a.title || "").replace(/"/g, '""')}"`,
    `"${(a.content || "").replace(/"/g, '""').substring(0, 100)}"`,
    `"${a.category?.category_name || ""}"`,
    `"${a.source?.source_name || ""}"`,
    `"${a.url || ""}"`,
    a.publication_date || ""
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `articles_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ======================================================
   POPULATE FILTER LISTS DYNAMICALLY
====================================================== */
async function loadCategories() {
  const list = el("#category-list");
  if (!list) return;

  list.innerHTML = `<p class="text-gray-400 text-sm">Loading...</p>`;

  const categories = await fetchJSON("/api/categories");
  list.innerHTML = "";

  if (!Array.isArray(categories)) {
    list.innerHTML = `<p class="text-red-500 text-sm">Failed to load</p>`;
    return;
  }

  categories.forEach(cat => {
    const label = document.createElement("label");
    label.className = "flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded";

    label.innerHTML = `
      <input 
        type="checkbox"
        value="${cat.category_id}"
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-0 focus:outline-none custom-checkbox"
      />
      <span class="ml-2 text-sm">${cat.category_name}</span>
    `;

    label.querySelector("input").addEventListener("change", () => {
      currentPage = 1;
      loadArticles();
    });
    list.appendChild(label);
  });
}

async function loadTags() {
  const list = el("#tag-list");
  if (!list) return;

  list.innerHTML = `<p class="text-gray-400 text-sm">Loading...</p>`;

  const tags = await fetchJSON("/api/tags");
  list.innerHTML = "";

  if (!Array.isArray(tags)) {
    list.innerHTML = `<p class="text-red-500 text-sm">Failed to load</p>`;
    return;
  }

  tags.forEach(tag => {
    const label = document.createElement("label");
    label.className = "flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded";

    label.innerHTML = `
      <input 
        type="checkbox"
        value="${tag.tag_id}"
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-0 focus:outline-none custom-checkbox"
      />
      <span class="ml-2 text-sm">${tag.tag_name}</span>
    `;

    label.querySelector("input").addEventListener("change", () => {
      currentPage = 1;
      loadArticles();
    });
    list.appendChild(label);
  });
}

async function loadSources() {
  const list = el("#source-list");
  if (!list) return;

  list.innerHTML = `<p class="text-gray-400 text-sm">Loading...</p>`;

  const sources = await fetchJSON("/api/sources");
  list.innerHTML = "";

  if (!Array.isArray(sources)) {
    list.innerHTML = `<p class="text-red-500 text-sm">Failed to load</p>`;
    return;
  }

  sources.forEach(source => {
    const label = document.createElement("label");
    label.className = "flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded";

    label.innerHTML = `
      <input 
        type="checkbox"
        value="${source.source_id}"
        class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-0 focus:outline-none custom-checkbox"
      />
      <span class="ml-2 text-sm">${source.source_name}</span>
    `;

    label.querySelector("input").addEventListener("change", () => {
      currentPage = 1;
      loadArticles();
    });
    list.appendChild(label);
  });
}

/* ======================================================
   SEARCH FILTER IN SIDEBAR
====================================================== */
function setupSearch() {
  const inputs = [
    { search: "#category-search", list: "#category-list" },
    { search: "#tag-search", list: "#tag-list" },
    { search: "#source-search", list: "#source-list" }
  ];

  inputs.forEach(({ search, list }) => {
    const searchEl = el(search);
    if (!searchEl) return;

    searchEl.addEventListener("input", e => {
      const value = e.target.value.toLowerCase();
      els(`${list} label`).forEach(label => {
        const text = label.textContent.toLowerCase();
        label.style.display = text.includes(value) ? "" : "none";
      });
    });
  });
}

/* ======================================================
   CLEAR FILTERS
====================================================== */
function setupClearButton() {
  const clearBtn = el("#clear-filters");
  if (!clearBtn) return;

  clearBtn.addEventListener("click", () => {
    els("input[type='checkbox']").forEach(cb => (cb.checked = false));
    el("#start-date").value = "";
    el("#end-date").value = "";
    els("[id$='-search']").forEach(input => (input.value = ""));
    els("[id$='-list'] label").forEach(label => (label.style.display = ""));
    
    currentPage = 1;
    currentSort = "newest";
    el("#sort-select").value = "newest";
    
    loadArticles();
  });
}

/* ======================================================
   SORT HANDLER
====================================================== */
function setupSort() {
  const sortSelect = el("#sort-select");
  if (!sortSelect) return;

  sortSelect.addEventListener("change", e => {
    currentSort = e.target.value;
    currentPage = 1;
    loadArticles();
  });
}

/* ======================================================
   EXPORT HANDLER
====================================================== */
function setupExport() {
  const exportBtn = el("#export-btn");
  if (!exportBtn) return;

  exportBtn.addEventListener("click", () => {
    const menu = document.createElement("div");
    menu.className = "absolute bg-white border border-gray-300 rounded shadow-lg z-50 mt-2";
    menu.innerHTML = `
      <button id="export-json" class="block w-full text-left px-4 py-2 hover:bg-gray-100">Export as JSON</button>
      <button id="export-csv" class="block w-full text-left px-4 py-2 hover:bg-gray-100 border-t">Export as CSV</button>
    `;
    
    exportBtn.parentElement.appendChild(menu);

    el("#export-json").addEventListener("click", () => {
      exportData("json");
      menu.remove();
    });

    el("#export-csv").addEventListener("click", () => {
      exportData("csv");
      menu.remove();
    });

    document.addEventListener("click", e => {
      if (!exportBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.remove();
      }
    }, { once: true });
  });
}

/* ======================================================
   PAGINATION PER-PAGE
====================================================== */
function setupPerPage() {
  const perPageSelect = el("#per-page");
  if (!perPageSelect) return;

  perPageSelect.addEventListener("change", e => {
    currentPerPage = parseInt(e.target.value);
    currentPage = 1;
    loadArticles();
  });
}

/* ======================================================
   DATE FILTER LISTENERS
====================================================== */
function setupDateFilters() {
  const startDate = el("#start-date");
  const endDate = el("#end-date");

  if (startDate) startDate.addEventListener("change", () => {
    currentPage = 1;
    loadArticles();
  });
  if (endDate) endDate.addEventListener("change", () => {
    currentPage = 1;
    loadArticles();
  });
}

/* ======================================================
   INITIALIZE PAGE
====================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing explore page...");
  
  await loadCategories();
  await loadTags();
  await loadSources();
  
  setupSearch();
  setupClearButton();
  setupSort();
  setupExport();
  setupPerPage();
  setupDateFilters();
  
  await loadArticles();
  
  console.log("Page initialized successfully!");
});