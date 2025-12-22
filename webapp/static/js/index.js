/* ======================================================
   LOAD AND DISPLAY STATS DYNAMICALLY
====================================================== */
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();

    if (!data.success) {
      console.error('Failed to load stats:', data.error);
      return;
    }

    const stats = data.stats;
    const container = document.getElementById('stats-container');

    if (!container) return;

    // Format numbers
    const formatNumber = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M+';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K+';
      return num.toString();
    };

    container.innerHTML = `
      <div class="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
        <span class="font-bold">${formatNumber(stats.total_words)}</span> Khmer Words
      </div>
      <div class="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
        <span class="font-bold">${formatNumber(stats.total_articles)}</span> Articles
      </div>
      <div class="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
        <span class="font-bold">${stats.total_categories}</span> Categories
      </div>
      <div class="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
        <span class="font-bold">${stats.total_sources}</span> Sources
      </div>
      <div class="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full">
        <span class="font-bold">${stats.date_span || 'N/A'}</span> Time Span
      </div>
    `;

    console.log('Stats loaded:', stats);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load stats when page loads
document.addEventListener('DOMContentLoaded', loadStats);