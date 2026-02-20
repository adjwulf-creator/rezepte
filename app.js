// app.js

// --- Database Service (IndexedDB) ---
const DB_NAME = 'MonLivreDeRecettes';
const DB_VERSION = 1;
const STORE_NAME = 'recipes';

class RecipeDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error: ", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('title', 'title', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async getAllRecipes() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addRecipe(recipe) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(recipe);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteRecipe(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// --- Application Logic ---
const db = new RecipeDB();
let recipes = [];

// DOM Elements
const recipeGrid = document.getElementById('recipeGrid');
const emptyState = document.getElementById('emptyState');
const addRecipeBtn = document.getElementById('addRecipeBtn');
const recipeModal = document.getElementById('recipeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const recipeForm = document.getElementById('recipeForm');
const imagePreview = document.getElementById('imagePreview');
const recipeImageInput = document.getElementById('recipeImage');

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortSelect = document.getElementById('sortSelect');

const viewModal = document.getElementById('viewModal');
const closeViewModalBtn = document.getElementById('closeViewModalBtn');
const viewRecipeDetails = document.getElementById('viewRecipeDetails');
const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

let currentViewRecipeId = null;

// Initialize app
async function initApp() {
    try {
        await db.init();
        await loadRecipes();
        setupEventListeners();
    } catch (error) {
        console.error("Failed to initialize app:", error);
    }
}

async function loadRecipes() {
    recipes = await db.getAllRecipes();
    renderRecipes();
}

// Render the grid based on current filters and search
function renderRecipes() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;
    const sortBy = sortSelect.value;

    // Filter
    let filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe.title.toLowerCase().includes(searchTerm) ||
            recipe.ingredients.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || recipe.category === category;
        return matchesSearch && matchesCategory;
    });

    // Sort
    filteredRecipes.sort((a, b) => {
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'za') return b.title.localeCompare(a.title);
        return 0;
    });

    // Render
    recipeGrid.innerHTML = '';

    if (filteredRecipes.length === 0) {
        recipeGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
    } else {
        recipeGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');

        filteredRecipes.forEach(recipe => {
            const card = document.createElement('article');
            card.className = 'recipe-card';
            card.onclick = () => openViewModal(recipe);

            const imageHtml = recipe.imageData
                ? `<img src="${recipe.imageData}" alt="${recipe.title}">`
                : `<i class="fa-solid fa-utensils"></i>`;

            card.innerHTML = `
                <div class="card-img-container">
                    ${imageHtml}
                </div>
                <div class="card-content">
                    <span class="recipe-tag">${recipe.category}</span>
                    <h3>${recipe.title}</h3>
                    <p>${recipe.ingredients.split('\n')[0]}...</p>
                </div>
            `;
            recipeGrid.appendChild(card);
        });
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Search & Filter
    searchInput.addEventListener('input', renderRecipes);
    categoryFilter.addEventListener('change', renderRecipes);
    sortSelect.addEventListener('change', renderRecipes);

    // Add Modal
    addRecipeBtn.addEventListener('click', () => {
        recipeForm.reset();
        imagePreview.innerHTML = '<span>Bild auswählen</span>';
        recipeModal.classList.remove('hidden');
    });

    const closeAddModal = () => recipeModal.classList.add('hidden');
    closeModalBtn.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);

    // View Modal
    closeViewModalBtn.addEventListener('click', () => {
        viewModal.classList.add('hidden');
        currentViewRecipeId = null;
    });

    // Image Upload Preview
    recipeImageInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                imagePreview.innerHTML = '';
                imagePreview.appendChild(img);
            }
            reader.readAsDataURL(file);
        }
    });

    // Form Submit
    recipeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('recipeTitle').value;
        const category = document.getElementById('recipeCategory').value;
        const ingredients = document.getElementById('recipeIngredients').value;
        const instructions = document.getElementById('recipeInstructions').value;

        // Handle Image
        let imageData = null;
        const imgElement = imagePreview.querySelector('img');
        if (imgElement) {
            imageData = imgElement.src; // Base64 Data URL
        }

        const newRecipe = {
            title,
            category,
            ingredients,
            instructions,
            imageData,
            createdAt: Date.now()
        };

        try {
            await db.addRecipe(newRecipe);
            await loadRecipes();
            closeAddModal();
        } catch (error) {
            alert('Fehler beim Speichern des Rezepts.');
            console.error(error);
        }
    });

    // Delete Recipe
    deleteRecipeBtn.addEventListener('click', async () => {
        if (currentViewRecipeId && confirm('Möchtest du dieses Rezept wirklich löschen?')) {
            try {
                await db.deleteRecipe(currentViewRecipeId);
                await loadRecipes();
                viewModal.classList.add('hidden');
                currentViewRecipeId = null;
            } catch (error) {
                alert('Fehler beim Löschen.');
                console.error(error);
            }
        }
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === recipeModal) closeAddModal();
        if (e.target === viewModal) viewModal.classList.add('hidden');
    });
}

// Open Recipe View Modal
function openViewModal(recipe) {
    currentViewRecipeId = recipe.id;

    const imageHtml = recipe.imageData
        ? `<img src="${recipe.imageData}" alt="${recipe.title}" class="recipe-detail-image">`
        : '';

    // Format ingredients as list
    const ingredientsList = recipe.ingredients
        .split('\n')
        .filter(i => i.trim() !== '')
        .map(i => `<li>${i}</li>`)
        .join('');

    viewRecipeDetails.innerHTML = `
        <div class="recipe-detail-header">
            ${imageHtml}
            <h2 class="recipe-detail-title">${recipe.title}</h2>
            <div class="recipe-detail-meta">
                <span><i class="fa-solid fa-tag"></i> ${recipe.category}</span>
                <span><i class="fa-regular fa-calendar"></i> ${new Date(recipe.createdAt).toLocaleDateString('de-DE')}</span>
            </div>
        </div>
        <div class="recipe-detail-body">
            <div class="ingredients-list">
                <h4>Zutaten</h4>
                <ul>
                    ${ingredientsList}
                </ul>
            </div>
            <div class="instructions-section">
                <h4>Zubereitung</h4>
                <p>${recipe.instructions}</p>
            </div>
        </div>
    `;

    viewModal.classList.remove('hidden');
}

// Boot up
document.addEventListener('DOMContentLoaded', initApp);
