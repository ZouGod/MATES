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
let allCategories = [];
let showAllCategories = false;
const CATEGORIES_TO_SHOW_INITIALLY = 6;

let allTags = [];
let currentTagPage = 1;
const TAGS_PER_PAGE = 20;
let tagSearchTerm = "";

let allSources = [];
let showAllSources = false;
const SOURCES_TO_SHOW_INITIALLY = 6;

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
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'k';
  }
  return num.toString();
}

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

  // Update word count - use the total_words from API response
  if (countWordsEl) {
    const totalWords = data.total_words || 0;
    countWordsEl.textContent = `${formatNumber(totalWords)} Words`;
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
    
    // Format individual article word count
    const wordCount = a.word_count || 0;
    const formattedWordCount = formatNumber(wordCount);

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
          <span>🔤 ${formattedWordCount} words</span>
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
  
  if (!Array.isArray(categories)) {
    list.innerHTML = `<p class="text-red-500 text-sm">Failed to load</p>`;
    return;
  }

  // Store all categories globally
  allCategories = categories;
  
  // Render categories with show/hide functionality
  renderCategoryList();
}

function renderCategoryList() {
  const list = el("#category-list");
  const searchInput = el("#category-search");
  
  if (!list) return;

  // Get currently checked category IDs BEFORE clearing the list
  const currentlyCheckedIds = els("#category-list input:checked")
    .map(cb => cb.value)
    .filter(v => v);

  list.innerHTML = "";

  if (allCategories.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-sm">No categories</p>`;
    return;
  }

  // Filter if searching
  let categoriesToDisplay = allCategories;
  if (searchInput && searchInput.value.trim()) {
    const searchTerm = searchInput.value.toLowerCase();
    categoriesToDisplay = allCategories.filter(cat => 
      cat.category_name.toLowerCase().includes(searchTerm)
    );
  }

  // Sort categories: checked ones first, then unchecked
  categoriesToDisplay.sort((a, b) => {
    const aChecked = currentlyCheckedIds.includes(a.category_id.toString());
    const bChecked = currentlyCheckedIds.includes(b.category_id.toString());
    
    if (aChecked && !bChecked) return -1; // a comes first
    if (!aChecked && bChecked) return 1;  // b comes first
    return 0; // keep original order for same checked status
  });

  // Determine how many to show
  const categoriesToShow = showAllCategories || (searchInput && searchInput.value.trim())
    ? categoriesToDisplay 
    : categoriesToDisplay.slice(0, CATEGORIES_TO_SHOW_INITIALLY);

  // Render categories
  categoriesToShow.forEach(cat => {
    const label = document.createElement("label");
    label.className = "flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded";

    // Check if this category was previously checked
    const isChecked = currentlyCheckedIds.includes(cat.category_id.toString());
    
    label.innerHTML = `
      <input 
        type="checkbox"
        value="${cat.category_id}"
        ${isChecked ? 'checked' : ''}
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

  // Show "Show All" or "Show Less" button if needed
  if (categoriesToDisplay.length > CATEGORIES_TO_SHOW_INITIALLY && (!searchInput || !searchInput.value.trim())) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "mt-2";
    
    if (!showAllCategories) {
      const remainingCount = categoriesToDisplay.length - CATEGORIES_TO_SHOW_INITIALLY;
      buttonContainer.innerHTML = `
        <button 
          class="w-full text-sm text-blue-600 hover:text-blue-800 font-medium p-2 hover:bg-blue-50 rounded-lg transition-colors show-all-btn"
        >
          Show all (${remainingCount} more)
        </button>
      `;
    } else {
      buttonContainer.innerHTML = `
        <button 
          class="w-full text-sm text-blue-600 hover:text-blue-800 font-medium p-2 hover:bg-blue-50 rounded-lg transition-colors show-less-btn"
        >
          Show less
        </button>
      `;
    }
    
    list.appendChild(buttonContainer);
    
    // Add event listener
    const button = list.querySelector(showAllCategories ? '.show-less-btn' : '.show-all-btn');
    if (button) {
      button.addEventListener('click', () => {
        showAllCategories = !showAllCategories;
        renderCategoryList();
      });
    }
  }
}

async function loadTags() {
  const list = el("#tag-list");
  if (!list) return;

  list.innerHTML = `<p class="text-gray-400 text-sm">Loading...</p>`;

  const tags = await fetchJSON("/api/tags");
  if (!Array.isArray(tags)) {
    list.innerHTML = `<p class="text-red-500 text-sm">Failed to load</p>`;
    return;
  }

  // Store all tags globally
  allTags = tags;
  currentTagPage = 1;
  tagSearchTerm = "";
  
  // Clear search input
  const searchInput = el("#tag-search");
  if (searchInput) {
    searchInput.value = "";
  }
  
  // Render tags with pagination
  renderTagList();
}

function renderTagList() {
  const list = el("#tag-list");
  const searchInput = el("#tag-search");
  
  if (!list) return;

  // Get ALL checked tag IDs (from entire page, not just visible)
  const currentlyCheckedIds = els("#tag-list input:checked")
    .map(cb => cb.value)
    .filter(v => v);

  list.innerHTML = "";

  if (allTags.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-sm">No tags</p>`;
    return;
  }

  // Separate checked and unchecked tags
  const allCheckedTags = allTags.filter(tag => 
    currentlyCheckedIds.includes(tag.tag_id.toString())
  );
  
  const allUncheckedTags = allTags.filter(tag => 
    !currentlyCheckedIds.includes(tag.tag_id.toString())
  );

  // Determine what to show:
  let tagsToShow = [];
  
  if (tagSearchTerm.trim()) {
    // When searching: show checked tags + matching unchecked tags
    const searchTerm = tagSearchTerm.toLowerCase();
    
    // All checked tags (always show when searching)
    tagsToShow = [...allCheckedTags];
    
    // Add unchecked tags that match search
    const matchingUnchecked = allUncheckedTags.filter(tag => 
      tag.tag_name.toLowerCase().includes(searchTerm)
    );
    tagsToShow.push(...matchingUnchecked);
    
  } else {
    // When NOT searching: show ONLY checked tags
    tagsToShow = [...allCheckedTags];
    
    // If no checked tags, show message
    if (tagsToShow.length === 0) {
      list.innerHTML = `<p class="text-gray-400 text-sm">No tags selected. Search to add tags.</p>`;
      return;
    }
  }

  // Sort: alphabetical
  tagsToShow.sort((a, b) => a.tag_name.localeCompare(b.tag_name));

  // Create flex container
  const flexContainer = document.createElement("div");
  flexContainer.className = "flex flex-wrap gap-2";
  
  // Render tags
  if (tagsToShow.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-sm">No tags found</p>`;
  } else {
    tagsToShow.forEach(tag => {
      const isChecked = currentlyCheckedIds.includes(tag.tag_id.toString());
      
      const tagElement = document.createElement("label");
      tagElement.className = `inline-flex items-center cursor-pointer px-3 py-1.5 rounded-full border ${
        isChecked 
          ? 'border-blue-500 bg-blue-100 text-blue-700' 
          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
      } transition-colors`;
      
      tagElement.innerHTML = `
        <input 
          type="checkbox"
          value="${tag.tag_id}"
          ${isChecked ? 'checked' : ''}
          class="hidden"
        />
        <div class="flex items-center">
          ${isChecked 
            ? '<svg class="w-4 h-4 mr-1.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>'
            : '<div class="w-4 h-4 mr-1.5 border border-gray-400 rounded"></div>'
          }
          <span class="text-sm whitespace-nowrap">
            ${tag.tag_name}
          </span>
        </div>
      `;

      tagElement.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const checkbox = tagElement.querySelector("input");
        checkbox.checked = !checkbox.checked;
        
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      });

      tagElement.querySelector("input").addEventListener("change", (e) => {
        e.stopPropagation();
        currentPage = 1;
        loadArticles();
        
        // Re-render to update display
        setTimeout(() => renderTagList(), 10);
      });
      
      flexContainer.appendChild(tagElement);
    });
    
    list.appendChild(flexContainer);
  }

  // Show message when searching but have checked tags
  if (tagSearchTerm.trim() && allCheckedTags.length > 0) {
    const message = document.createElement("div");
    message.className = "text-xs text-gray-500 mt-2";
    message.textContent = `${allCheckedTags.length} tag${allCheckedTags.length > 1 ? 's' : ''} selected`;
    list.appendChild(message);
  }
}

async function loadSources() {
  const list = el("#source-list");
  if (!list) return;

  list.innerHTML = `<p class="text-gray-400 text-sm">Loading...</p>`;

  const sources = await fetchJSON("/api/sources");
  
  if (!Array.isArray(sources)) {
    list.innerHTML = `<p class="text-red-500 text-sm">Failed to load</p>`;
    return;
  }

  // Store all sources globally
  allSources = sources;
  
  // Render sources with show/hide functionality
  renderSourceList();
}

function renderSourceList() {
  const list = el("#source-list");
  const searchInput = el("#source-search");
  
  if (!list) return;

  // Get currently checked source IDs BEFORE clearing the list
  const currentlyCheckedIds = els("#source-list input:checked")
    .map(cb => cb.value)
    .filter(v => v);

  list.innerHTML = "";

  if (allSources.length === 0) {
    list.innerHTML = `<p class="text-gray-400 text-sm">No sources</p>`;
    return;
  }

  // Filter if searching
  let sourcesToDisplay = allSources;
  if (searchInput && searchInput.value.trim()) {
    const searchTerm = searchInput.value.toLowerCase();
    sourcesToDisplay = allSources.filter(source => 
      source.source_name.toLowerCase().includes(searchTerm)
    );
  }

  // Sort sources: checked ones first, then alphabetical
  sourcesToDisplay.sort((a, b) => {
    const aChecked = currentlyCheckedIds.includes(a.source_id.toString());
    const bChecked = currentlyCheckedIds.includes(b.source_id.toString());
    
    if (aChecked && !bChecked) return -1; // a comes first
    if (!aChecked && bChecked) return 1;  // b comes first
    return a.source_name.localeCompare(b.source_name);
  });

  // Determine how many to show
  const sourcesToShow = showAllSources || (searchInput && searchInput.value.trim())
    ? sourcesToDisplay 
    : sourcesToDisplay.slice(0, SOURCES_TO_SHOW_INITIALLY);

  // Render sources
  sourcesToShow.forEach(source => {
    const label = document.createElement("label");
    label.className = "flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded";

    // Check if this source was previously checked
    const isChecked = currentlyCheckedIds.includes(source.source_id.toString());
    
    label.innerHTML = `
      <input 
        type="checkbox"
        value="${source.source_id}"
        ${isChecked ? 'checked' : ''}
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

  // Show "Show All" or "Show Less" button if needed
  if (sourcesToDisplay.length > SOURCES_TO_SHOW_INITIALLY && (!searchInput || !searchInput.value.trim())) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "mt-2";
    
    if (!showAllSources) {
      const remainingCount = sourcesToDisplay.length - SOURCES_TO_SHOW_INITIALLY;
      buttonContainer.innerHTML = `
        <button 
          class="w-full text-sm text-blue-600 hover:text-blue-800 font-medium p-2 hover:bg-blue-50 rounded-lg transition-colors show-all-sources-btn"
        >
          Show all (${remainingCount} more)
        </button>
      `;
    } else {
      buttonContainer.innerHTML = `
        <button 
          class="w-full text-sm text-blue-600 hover:text-blue-800 font-medium p-2 hover:bg-blue-50 rounded-lg transition-colors show-less-sources-btn"
        >
          Show less
        </button>
      `;
    }
    
    list.appendChild(buttonContainer);
    
    // Add event listener
    const button = list.querySelector(showAllSources ? '.show-less-sources-btn' : '.show-all-sources-btn');
    if (button) {
      button.addEventListener('click', () => {
        showAllSources = !showAllSources;
        renderSourceList();
      });
    }
  }
}

/* ======================================================
   DATE FILTER LISTENERS
====================================================== */
function setupDateFilters() {
  const startDateInput = el("#start-date");
  const endDateInput = el("#end-date");
  
  // Real-time updates on date change
  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      currentPage = 1;
      loadArticles();
    });
  }
  
  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      currentPage = 1;
      loadArticles();
    });
  }
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
      if (search === "#category-search") {
        // For categories, use the new render function
        renderCategoryList();
      } else if (search === "#tag-search") {
        // For tags, handle search and reset to page 1
        tagSearchTerm = e.target.value;
        currentTagPage = 1;
        renderTagList();
      } else if (search === "#source-search") {
        // For sources, use the new render function
        renderSourceList();
      } else {
        // For other lists, use the original behavior
        const value = e.target.value.toLowerCase();
        els(`${list} label`).forEach(label => {
          const text = label.textContent.toLowerCase();
          label.style.display = text.includes(value) ? "" : "none";
        });
      }
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
    
    // Clear date inputs
    const startDateInput = el("#start-date");
    const endDateInput = el("#end-date");
    if (startDateInput) startDateInput.value = "";
    if (endDateInput) endDateInput.value = "";
    
    els("[id$='-search']").forEach(input => (input.value = ""));
    els("[id$='-list'] label").forEach(label => (label.style.display = ""));
    
    currentPage = 1;
    currentSort = "newest";
    el("#sort-select").value = "newest";
    
    // Reset category show/hide state
    showAllCategories = false;
    
    // Reset tag search and pagination
    tagSearchTerm = "";
    currentTagPage = 1;
    
    // Reset source show/hide state
    showAllSources = false;
    
    loadArticles();
    
    // Re-render category list to show initial state
    renderCategoryList();
    
    // Re-render tag list to show initial state
    renderTagList();
    
    // Re-render source list to show initial state
    renderSourceList();
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