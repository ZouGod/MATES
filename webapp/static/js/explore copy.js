const clearBtn = document.getElementById('clear-filters');
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const searchInputs = [
  document.getElementById('category-search'),
  document.getElementById('tag-search'),
  document.getElementById('source-search')
];

// Only add listeners if elements exist
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    checkboxes.forEach(cb => (cb.checked = false));
    searchInputs.forEach(input => {
      if (input) input.value = "";
    });
    document.querySelectorAll('#category-list label, #tag-list label, #source-list label')
      .forEach(label => label.style.display = "");
  });
}

// Simple search filter
searchInputs.forEach(input => {
  if (input) {
    input.addEventListener('input', e => {
      const value = e.target.value.toLowerCase();
      let listSelector = '#category-list';
      
      if (e.target.id === 'tag-search') {
        listSelector = '#tag-list';
      } else if (e.target.id === 'source-search') {
        listSelector = '#source-list';
      }
      
      document.querySelectorAll(`${listSelector} label`).forEach(label => {
        label.style.display = label.textContent.toLowerCase().includes(value) ? "" : "none";
      });
    });
  }
});

// Style checkboxes on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.classList.add("custom-checkbox");
  });
});

// helpers
function el(sel) { return document.querySelector(sel); }
function els(sel) { return Array.from(document.querySelectorAll(sel)); }

async function fetchJSON(url) {
  const resp = await fetch(url);
  return await resp.json();
}

/* Render a list of checkboxes (preserve id prefixes) */
function renderCheckboxList(containerId, items, prefix, nameAttr) {
  const elContainer = document.getElementById(containerId);
  if (!elContainer) return;
  elContainer.innerHTML = "";
  items.forEach(item => {
    // item: {id, name} or {id, url, name}
    const id = `${prefix}${item.id}`;
    const label = document.createElement("label");
    label.className = "flex items-center";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.name = nameAttr || prefix;
    input.value = item.id;
    // keep user's original classes (the ones you're using)
    input.className = "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none";

    const span = document.createElement("span");
    span.className = "ml-2 text-sm font-medium text-gray-700";
    span.textContent = item.name || item.source_name || item.tag_name;

    label.appendChild(input);
    label.appendChild(span);
    elContainer.appendChild(label);
  });

  // trigger enhancement (remove border) after inserting
  if (window._enhanceCheckboxes) window._enhanceCheckboxes();
}

/* Load filters (categories, tags, sources) */
async function loadFilters() {
  const categories = await fetchJSON("/api/categories");
  renderCheckboxList("category-list", categories, "cat", "category");

  const tags = await fetchJSON("/api/tags");
  renderCheckboxList("tag-list", tags, "tag", "tag");

  const sources = await fetchJSON("/api/sources");
  renderCheckboxList("source-list", sources, "src", "source");

  attachFilterListeners();
}

/* Collect selected filter params */
function collectFilters() {
  const params = new URLSearchParams();
  // categories: allow multiple
  const cats = els("#category-list input[type='checkbox']:checked").map(i => i.value);
  if (cats.length) params.append("category", cats.join(","));

  const tags = els("#tag-list input[type='checkbox']:checked").map(i => i.value);
  if (tags.length) params.append("tag", tags.join(","));

  const sources = els("#source-list input[type='checkbox']:checked").map(i => i.value);
  if (sources.length) params.append("source", sources.join(","));

  const start = el("#start-date") && el("#start-date").value;
  const end = el("#end-date") && el("#end-date").value;
  if (start) params.append("start", start);
  if (end) params.append("end", end);

  // pagination/sort/query can be added
  params.append("page", "1");
  params.append("per_page", "20");

  return params;
}

/* Render articles into UI */
function renderArticles(data) {
  const container = document.getElementById("article-container");
  if (!container) return;
  container.innerHTML = "";

  data.articles.forEach(a => {
    const art = document.createElement("article");
    art.className = "bg-white rounded-2xl border border-blue-100 shadow-sm p-6 hover:shadow-md transition";
    art.innerHTML = `
      <p class="text-xs font-semibold text-blue-700 uppercase mb-1">${a.category ? a.category.name : ""}</p>
      <h3 class="font-semibold text-gray-800 mb-2">${a.title}</h3>
      <p class="text-sm text-gray-600 mb-3">${a.source ? a.source.name : ""}</p>
      <p class="text-sm text-gray-700">${a.content_preview || ""}</p>
      <div class="flex justify-between items-center text-sm text-gray-500 mt-4">
        <div class="flex flex-col space-y-1">
          <span>📅 ${a.publication_date || ""}</span>
          <span>✍ ${a.word_count || 0} words</span>
        </div>
        <a href="${a.url}" target="_blank" class="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded">Open</a>
      </div>`;
    container.appendChild(art);
  });
}

/* Load articles according to current filters */
async function loadArticles() {
  const params = collectFilters();
  const url = "/api/articles?" + params.toString();
  const data = await fetchJSON(url);
  renderArticles(data);
}

/* attach change listeners to filters to auto-query */
function attachFilterListeners() {
  const inputs = els("#category-list input, #tag-list input, #source-list input, #start-date, #end-date");
  inputs.forEach(i => i.addEventListener("change", () => loadArticles()));

  const clearBtn = document.getElementById("clear-filters");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      // uncheck everything
      els("#category-list input, #tag-list input, #source-list input").forEach(i => i.checked = false);
      el("#start-date").value = "";
      el("#end-date").value = "";
      loadArticles();
    });
  }
}

/* Expose a hook to enhance checkboxes after render */
window._enhanceCheckboxes = function() {
  if (window._enhanceCheckboxesInjected) return;
  const script = document.createElement("script");
  script.src = "/static/js/enhance-checkboxes.js";
  document.body.appendChild(script);
  window._enhanceCheckboxesInjected = true;
};

/* init */
document.addEventListener("DOMContentLoaded", () => {
  loadFilters().then(() => loadArticles());
});
