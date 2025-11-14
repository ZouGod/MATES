
const clearBtn = document.getElementById('clear-filters');
const checkboxes = document.querySelectorAll('input[type="checkbox"]');
const searchInputs = [document.getElementById('category-search'), document.getElementById('org-search')];

// Clear all filters
clearBtn.addEventListener('click', () => {
checkboxes.forEach(cb => (cb.checked = false));
searchInputs.forEach(input => (input.value = ""));
document.querySelectorAll('#category-list label, #org-list label').forEach(label => label.classList.remove('hidden'));
});

// Simple search filter
searchInputs.forEach(input => {
input.addEventListener('input', e => {
    const value = e.target.value.toLowerCase();
    const list = e.target.id === 'category-search' ? '#category-list' : '#org-list';
    document.querySelectorAll(`${list} label`).forEach(label => {
    label.style.display = label.textContent.toLowerCase().includes(value) ? "" : "none";
    });
});
});

