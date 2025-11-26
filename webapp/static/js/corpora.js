/**
 * Load and render category cards dynamically (limit to 3)
 * Shows word count and article statistics like corpus
 */

// Helper function to format word counts
function formatWords(count) {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M words';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K words';
  return count + ' words';
}

// Get badge color based on article count
function getBadgeColor(articleCount) {
  if (articleCount > 5000) return 'bg-green-100 text-green-800';
  if (articleCount > 1000) return 'bg-blue-100 text-blue-800';
  return 'bg-yellow-100 text-yellow-800';
}

// Get badge type based on article count
function getBadgeType(articleCount) {
  if (articleCount > 5000) return 'Core';
  if (articleCount > 1000) return 'Academic';
  return 'Updated';
}

// Load categories from API
async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const categories = await response.json();
    
    if (!Array.isArray(categories) || categories.length === 0) {
      showNoData();
      return;
    }
    
    // Limit to 3 categories and fetch their stats
    const limitedCategories = categories.slice(0, 3);
    await renderCategories(limitedCategories);
    
  } catch (error) {
    console.error('Error loading categories:', error);
    showError(error.message);
  }
}

// Get article count, word count, and date range for a category
async function getCategoryStats(categoryId) {
  try {
    const response = await fetch(`/api/articles?category=${categoryId}&per_page=1000`);
    const data = await response.json();
    
    let totalWords = 0;
    let dateInfo = { start: null, end: null };
    
    // Calculate word count and date range from articles
    if (data.articles && data.articles.length > 0) {
      // Sum character counts and convert to words (divide by 5)
      totalWords = data.articles.reduce((sum, article) => {
        return sum + (article.character_count || 0);
      }, 0) / 5;
      
      // Get date range
      const dates = data.articles
        .map(a => a.publication_date)
        .filter(d => d)
        .sort();
      
      if (dates.length > 0) {
        dateInfo.start = dates[0];
        dateInfo.end = dates[dates.length - 1];
      }
    }
    
    return {
      article_count: data.total || 0,
      word_count: Math.round(totalWords),
      date_start: dateInfo.start,
      date_end: dateInfo.end
    };
  } catch (error) {
    console.error('Error fetching category stats:', error);
    return { 
      article_count: 0, 
      word_count: 0,
      date_start: null,
      date_end: null
    };
  }
}

// Get timespan string
function getTimespan(startDate, endDate) {
  if (!startDate && !endDate) return 'N/A';
  
  try {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && end) {
      return `${start.getFullYear()}–${end.getFullYear()}`;
    } else if (start) {
      return `${start.getFullYear()}`;
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }
  
  return 'N/A';
}

// Render category cards
async function renderCategories(categories) {
  const container = document.getElementById('corpora-container');
  
  if (!container) return;
  
  container.innerHTML = '';
  
  for (const category of categories) {
    const stats = await getCategoryStats(category.category_id);
    const badgeColor = getBadgeColor(stats.article_count);
    const badgeType = getBadgeType(stats.article_count);
    const timespan = getTimespan(stats.date_start, stats.date_end);
    
    const card = document.createElement('div');
    card.className = 'bg-white shadow-md overflow-hidden corpus-card border border-gray-200 rounded-xl hover:shadow-lg transition';
    
    card.innerHTML = `
      <div class="p-6">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-800">
            ${category.category_name}
          </h3>
          <span class="${badgeColor} text-xs font-medium px-2.5 py-0.5 rounded-full">
            ${badgeType}
          </span>
        </div>
        
        <p class="text-gray-600 mb-6">
          Khmer language category for ${category.category_name}
        </p>
        
        <div class="flex justify-between text-sm text-gray-500 mb-4">
          <span><i class="fas fa-calendar mr-1"></i> ${timespan}</span>
          <span><i class="fas fa-file-word mr-1"></i> ${formatWords(stats.word_count)}</span>
        </div>
        
        <div class="text-xs text-gray-500 mb-4">
          <i class="fas fa-file-alt mr-1"></i> ${stats.article_count} articles
        </div>
        
        <button class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition" onclick="exploreCategory(${category.category_id}, '${category.category_name}')">
          Explore Category
        </button>
      </div>
    `;
    
    container.appendChild(card);
  }
}

// Navigate to explore page with category filter
function exploreCategory(categoryId, categoryName) {
  window.location.href = `/explore?category=${categoryId}`;
}

// Show error message
function showError(message) {
  const container = document.getElementById('corpora-container');
  if (container) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-red-500">Error loading categories: ${message}</p>
      </div>
    `;
  }
}

// Show no data message
function showNoData() {
  const container = document.getElementById('corpora-container');
  if (container) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12">
        <p class="text-gray-500">No categories found. Please add some categories and articles first.</p>
      </div>
    `;
  }
}

// Load categories when page loads
document.addEventListener('DOMContentLoaded', loadCategories);