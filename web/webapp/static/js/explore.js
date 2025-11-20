/* ======================================================
   BASIC UI SELECTORS
====================================================== */
const clearBtn = document.getElementById('clear-filters');
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const searchInputs = [
  document.getElementById('category-search'),
  document.getElementById('tag-search'),
  document.getElementById('source-search')
];

/* ======================================================
   CLEAR FILTERS
====================================================== */
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    checkboxes.forEach(cb => (cb.checked = false));

    searchInputs.forEach(input => {
      if (input) input.value = "";
    });

    document.querySelectorAll('#category-list label, #tag-list label, #source-list label')
      .forEach(label => (label.style.display = ""));

    loadArticles(); // reload API
  });
}

/* ======================================================
   SEARCH FILTER (Category / Tag / Source)
====================================================== */
searchInputs.forEach(input => {
  if (!input) return;

  input.addEventListener('input', e => {
    const value = e.target.value.toLowerCase();
    let listSelector = '#category-list';

    if (e.target.id === 'tag-search') listSelector = '#tag-list';
    if (e.target.id === 'source-search') listSelector = '#source-list';

    document.querySelectorAll(`${listSelector} label`).forEach(label => {
      const text = label.textContent.toLowerCase();
      label.style.display = text.includes(value) ? '' : 'none';
    });
  });
});

/* ======================================================
   REMOVE DEFAULT CHECKBOX BORDER
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.classList.add("custom-checkbox"); // use your styling class
  });
});

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
  const resp = await fetch(url);
  return await resp.json();
}

/* ======================================================
   COLLECT FILTER PARAMETERS
====================================================== */
function collectFilters() {
  const params = new URLSearchParams();

  const cats = els("#category-list input:checked").map(cb => cb.value);
  if (cats.length > 0) params.append("categories", cats.join(","));

  const tags = els("#tag-list input:checked").map(cb => cb.value);
  if (tags.length > 0) params.append("tags", tags.join(","));

  const sources = els("#source-list input:checked").map(cb => cb.value);
  if (sources.length > 0) params.append("sources", sources.join(","));

  // Always include pagination
  params.append("page", "1");
  params.append("per_page", "20");

  return params;
}


/* ======================================================
   RENDER ARTICLES (CARD UI)
====================================================== */
function renderArticles(data) {
    console.log(data)
  const container = document.getElementById("cards");
document.getElementById("count-articals").textContent = data.total + " Articles";

  if (!container) return;

  container.innerHTML = "";

  if (!data.articles || data.articles.length === 0) {
    container.innerHTML = `<p class="text-gray-500">No results found.</p>`;
    return;
  }

  data.articles.forEach(a => {
    const card = document.createElement("article");
    card.className =
      "bg-white rounded-2xl border border-blue-100 shadow-sm p-6 hover:shadow-md transition";

    const categoryName = a.category?.name || "";
    const sourceName = a.source?.name || "";
    const sourceUrl = a.source?.url || "#";
    const preview = a.content_preview?.slice(0, 150) + "...";

    card.innerHTML = `
      <p class="text-xs font-semibold text-blue-700 uppercase mb-1">
        ${categoryName}
      </p>

      <h3 class="font-semibold text-gray-800 mb-2">
        ${a.title}
      </h3>
      <p class="text-sm text-gray-700 mb-3">
        ${preview}
      </p>

      <div class="flex justify-between items-center text-sm text-gray-500 mt-4">
        <div class="flex flex-col space-y-1">
          <span>📅 ${a.publication_date || ""}</span>
          <span>🔤 ${a.character_count || 0} chars</span>
        </div>

        <a
          href="${sourceUrl}"
          target="_blank"
          class="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded"
        >
          OPEN
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}


/* ======================================================
   LOAD ARTICLES FROM API
====================================================== */
async function loadArticles() {
  const params = collectFilters();
  const url = `/api/articles?${params.toString()}`;

  const data = await fetchJSON(url);
  renderArticles(data);
}

/* ======================================================
   AUTO RELOAD WHEN CHECKBOXES CHANGE
====================================================== */
function attachFilterListeners() {
  const listeners = els("#category-list input, #tag-list input, #source-list input");

  listeners.forEach(input => {
    input.addEventListener("change", () => {
      loadArticles();
    });
  });
}

/* ======================================================
   INITIALIZE PAGE
====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  attachFilterListeners();
  loadArticles();
});
