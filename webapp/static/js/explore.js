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
   URL PARAMETER HANDLING
====================================================== */
function getUrlParameter(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function applyInitialCategoryFilter() {
  const categoryParam = getUrlParameter("category");
  if (categoryParam) {
    initialCategoryFromUrl = categoryParam;
    console.log("Found category parameter in URL:", initialCategoryFromUrl);
    
    // First, uncheck ALL categories
    els("#category-list input").forEach(cb => cb.checked = false);
    
    // Then check only the one from homepage
    const checkbox = el(`#category-list input[value="${categoryParam}"]`);
    if (checkbox) {
      checkbox.checked = true;
    }
    
    // Clean the URL - remove query parameter from address bar
    window.history.replaceState({}, document.title, "/explore");
  }
}

/* ======================================================
   STATE MANAGEMENT
====================================================== */
let currentPage = 1;
let currentSort = "newest";
let currentPerPage = 10;  // Reduced from 20 for faster initial load
let lastApiResponse = null;
let allCategories = [];
let showAllCategories = false;
const CATEGORIES_TO_SHOW_INITIALLY = 6;
let initialCategoryFromUrl = null;

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

  // Get all checked categories
  const cats = els("#category-list input:checked").map(cb => cb.value).filter(v => v);
  if (cats.length > 0) {
    params.append("category", cats.join(","));
  }

  // Get all checked tags
  const tags = els("#tag-list input:checked").map(cb => cb.value).filter(v => v);
  if (tags.length > 0) {
    params.append("tag", tags.join(","));
  }

  // Get all checked sources
  const sources = els("#source-list input:checked").map(cb => cb.value).filter(v => v);
  if (sources.length > 0) {
    params.append("source", sources.join(","));
  }

  const startDate = el("#start-date")?.value;
  const endDate = el("#end-date")?.value;
  if (startDate) params.append("start", startDate);
  if (endDate) params.append("end", endDate);

  // Get search query if any
  const searchInput = el("#search-query");
  if (searchInput && searchInput.value) {
    params.append("q", searchInput.value);
  }

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
    countEl.textContent = `${formatNumber(data.total) || 0} Articles`;
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
      <!--
      <p class="text-sm text-gray-700 mb-3 line-clamp-2">
        ${preview}
      </p>
      -->
      <p class="text-sm text-gray-600 mb-3">${sourceName}</p>
      <div class="flex justify-between items-center text-sm text-gray-500 mt-4">
        <div class="flex flex-col space-y-1">
          <span><i class="fas fa-calendar mr-1"></i> ${a.publication_date || "N/A"}</span>
          <span><i class="fas fa-file-word mr-1"></i>  ${formattedWordCount} words</span>
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
async function exportData(format = "json") {
  try {
    console.log("Starting export in format:", format);
    
    // Build params from current filter selections only (no pagination)
    const params = new URLSearchParams();

    // Get all checked categories
    const cats = els("#category-list input:checked").map(cb => cb.value).filter(v => v);
    if (cats.length > 0) {
      params.append("category", cats.join(","));
    }

    // Get all checked tags
    const tags = els("#tag-list input:checked").map(cb => cb.value).filter(v => v);
    if (tags.length > 0) {
      params.append("tag", tags.join(","));
    }

    // Get all checked sources
    const sources = els("#source-list input:checked").map(cb => cb.value).filter(v => v);
    if (sources.length > 0) {
      params.append("source", sources.join(","));
    }

    const startDate = el("#start-date")?.value;
    const endDate = el("#end-date")?.value;
    if (startDate) params.append("start", startDate);
    if (endDate) params.append("end", endDate);

    // Get search query if any
    const searchInput = el("#search-query");
    if (searchInput && searchInput.value) {
      params.append("q", searchInput.value);
    }
    
    const url = `/api/articles/export?${params.toString()}`;
    console.log("Exporting from URL:", url);
    
    const data = await fetchJSON(url);
    
    if (!data) {
      console.error("No data returned from API");
      alert("Failed to fetch articles");
      return;
    }

    if (!data.articles || data.articles.length === 0) {
      alert("No articles to export");
      return;
    }

    const articles = data.articles;
    console.log("Successfully fetched", articles.length, "articles");

    if (format === "json") {
      exportJSON(articles);
    } else if (format === "csv") {
      exportCSV(articles);
    } else {
      alert("Unknown export format");
    }
    
    // Reload articles with current filters to ensure stats stay correct
    await loadArticles();
    
  } catch (error) {
    console.error("Export error:", error);
    alert("Error during export: " + error.message);
  }
}

function exportJSON(articles) {
  try {
    const data = JSON.stringify(articles, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `articles_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    // alert(`Successfully exported ${articles.length} articles as JSON`);
  } catch (error) {
    console.error("JSON export error:", error);
    // alert("Error exporting JSON");
  }
}

function exportCSV(articles) {
  try {
    const headers = ["Title", "Content", "Category", "Source", "URL", "Publication Date", "Word Count", "Character Count"];
    const rows = articles.map(a => [
      `"${(a.title || "").replace(/"/g, '""')}"`,
      `"${(a.content || "").replace(/"/g, '""')}"`,
      `"${a.category_name || ""}"`,
      `"${a.source_name || ""}"`,
      `"${a.url || ""}"`,
      a.publication_date || "",
      a.word_count || 0,
      a.character_count || 0
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `articles_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    // alert(`Successfully exported ${articles.length} articles as CSV`);
  } catch (error) {
    console.error("CSV export error:", error);
    // alert("Error exporting CSV");
  }
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

    // Check if this category was previously checked OR if it matches URL parameter
    const isChecked = currentlyCheckedIds.includes(cat.category_id.toString()) 
      || (initialCategoryFromUrl && cat.category_id.toString() === initialCategoryFromUrl);
    
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
    const sortLabel = el("#sort-label");
    if (sortLabel) sortLabel.textContent = "Most Recent";

    
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
   DROPDOWN HANDLING - SIMPLE WORKING VERSION
====================================================== */
function setupSortDropdown() {
  console.log("Setting up dropdowns...");
  
  const sortLabel = el("#sort-label");
  const sortDropdown = el("#sortDropdown");
  const sortBtn = el("#sortDropdownButton");
  const exportDropdown = el("#exportDropdown");
  const exportBtn = el("#exportDropdownButton");
  
  // Check if elements exist
  console.log("Elements:", {
    sortBtn: !!sortBtn,
    sortDropdown: !!sortDropdown,
    exportBtn: !!exportBtn,
    exportDropdown: !!exportDropdown
  });
  
  // Sort dropdown
  if (sortBtn) {
    sortBtn.addEventListener("click", function(e) {
      console.log("Sort button clicked!");
      e.stopPropagation();
      e.preventDefault();
      
      // Close export dropdown
      if (exportDropdown) {
        exportDropdown.classList.add("hidden");
      }
      
      // Toggle sort dropdown
      if (sortDropdown) {
        const isHidden = sortDropdown.classList.contains("hidden");
        console.log("Sort dropdown is hidden?", isHidden);
        
        // Position dropdown correctly
        if (isHidden) {
          sortDropdown.style.position = "absolute";
          sortDropdown.style.top = "100%";
          sortDropdown.style.left = "0";
          sortDropdown.style.zIndex = "9999";
        }
        
        sortDropdown.classList.toggle("hidden");
      }
    });
  }
  
  // Export dropdown
  if (exportBtn) {
    exportBtn.addEventListener("click", function(e) {
      console.log("Export button clicked!");
      e.stopPropagation();
      e.preventDefault();
      
      // Close sort dropdown
      if (sortDropdown) {
        sortDropdown.classList.add("hidden");
      }
      
      // Toggle export dropdown
      if (exportDropdown) {
        const isHidden = exportDropdown.classList.contains("hidden");
        console.log("Export dropdown is hidden?", isHidden);
        
        // Position dropdown correctly
        if (isHidden) {
          exportDropdown.style.position = "absolute";
          exportDropdown.style.top = "100%";
          exportDropdown.style.left = "0";
          exportDropdown.style.zIndex = "9999";
        }
        
        exportDropdown.classList.toggle("hidden");
      }
    });
  }
  
  // Handle sort options
  if (sortDropdown) {
    sortDropdown.querySelectorAll("button[data-sort]").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        currentSort = this.dataset.sort;
        currentPage = 1;
        
        if (sortLabel) {
          sortLabel.textContent = this.textContent.trim();
        }
        
        sortDropdown.classList.add("hidden");
        loadArticles();
      });
    });
  }
  
  // Handle export options
  if (exportDropdown) {
    exportDropdown.querySelectorAll("button[data-export]").forEach(btn => {
      btn.addEventListener("click", async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const type = this.dataset.export;
        await exportData(type);
        exportDropdown.classList.add("hidden");
      });
    });
  }
  
  // Close dropdowns when clicking anywhere on page
  document.addEventListener("click", function(e) {
    // Check if click is inside sort dropdown or button
    const isSortClick = sortBtn?.contains(e.target) || sortDropdown?.contains(e.target);
    
    // Check if click is inside export dropdown or button
    const isExportClick = exportBtn?.contains(e.target) || exportDropdown?.contains(e.target);
    
    // Only close if click is outside both dropdown areas
    if (!isSortClick && sortDropdown) {
      sortDropdown.classList.add("hidden");
    }
    
    if (!isExportClick && exportDropdown) {
      exportDropdown.classList.add("hidden");
    }
  });
  
  // Prevent dropdowns from closing when clicking inside them
  if (sortDropdown) {
    sortDropdown.addEventListener("click", function(e) {
      e.stopPropagation();
    });
  }
  
  if (exportDropdown) {
    exportDropdown.addEventListener("click", function(e) {
      e.stopPropagation();
    });
  }
  
  console.log("Dropdown setup complete!");
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
  
  // Check for category parameter in URL before loading categories
  applyInitialCategoryFilter();
  
  await loadCategories();
  await loadTags();
  await loadSources();
  
  setupSearch();
  setupClearButton();
  setupPerPage();
  setupDateFilters();
  setupSortDropdown();
  
  await loadArticles();
  
  console.log("Page initialized successfully!");
});