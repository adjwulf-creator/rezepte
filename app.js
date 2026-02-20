// app.js

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://tdexsgzinjbabiczihwj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xtguokRm66tP1SEwGC-RaQ_ifuZSJ9U';

// Initialize Supabase Client
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let recipes = [];

// DOM Elements
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleLink = document.getElementById('authToggleLink');
const authToggleText = document.getElementById('authToggleText');
const authMainTitle = document.getElementById('authMainTitle');
const loginSubtitle = document.querySelector('.login-subtitle');
const logoutBtn = document.getElementById('logoutBtn');

let isLoginMode = true; // Toggle between login and register
let currentUser = null;

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
    setupEventListeners();
    await checkUser();
}

async function checkUser() {
    const { data: { session } } = await sbClient.auth.getSession();
    if (session) {
        // Logged in
        currentUser = session.user;
        loginOverlay.classList.add('hidden');
        await loadRecipes();
    } else {
        // Not logged in
        currentUser = null;
        loginOverlay.classList.remove('hidden');
    }

    // Listen for auth changes
    sbClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            loginOverlay.classList.add('hidden');
            loadRecipes();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            loginOverlay.classList.remove('hidden');
            recipes = [];
            renderRecipes();
        }
    });
}

// Holen der Rezepte aus Supabase
async function loadRecipes() {
    if (!currentUser) return;

    const { data, error } = await sbClient
        .from('recipes')
        .select('*')
        .eq('user_id', currentUser.id) // Only load recipes for current user
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("Error loading recipes:", error);
        return;
    }

    recipes = data;
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
    // Auth - Toggle Mode
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        loginError.classList.add('hidden');

        const loginBox = document.querySelector('.login-box');

        if (isLoginMode) {
            loginBox.classList.remove('register-mode');
            authMainTitle.textContent = 'Anmelden';
            loginSubtitle.textContent = 'Bitte melde dich an, um fortzufahren.';
            authSubmitBtn.textContent = 'Anmelden';
            authToggleText.textContent = 'Noch kein Konto?';
            authToggleLink.textContent = 'Jetzt registrieren';
        } else {
            loginBox.classList.add('register-mode');
            authMainTitle.textContent = 'Registrieren';
            loginSubtitle.textContent = 'Erstelle ein neues Konto für dein Kochbuch.';
            authSubmitBtn.textContent = 'Konto erstellen';
            authToggleText.textContent = 'Bereits ein Konto?';
            authToggleLink.textContent = 'Hier anmelden';
        }
    });

    // Auth - Login/Register
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');

        const email = loginEmail.value;
        const password = loginPassword.value;

        const origText = authSubmitBtn.textContent;
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Lädt...';

        let authError = null;

        if (isLoginMode) {
            const { error } = await sbClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            authError = error;
        } else {
            const { error } = await sbClient.auth.signUp({
                email: email,
                password: password,
            });
            authError = error;
            if (!error) {
                alert('Registrierung erfolgreich! Je nach deinen Supabase-Einstellungen musst du evtl. noch deine E-Mail bestätigen. Falls Auto-Confirm an ist, bist du jetzt eingeloggt!');
            }
        }

        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = origText;

        if (authError) {
            loginError.textContent = isLoginMode ? "Fehler: E-Mail oder Passwort falsch." : "Fehler bei der Registrierung: " + authError.message;
            loginError.classList.remove('hidden');
        } else {
            loginForm.reset();
        }
    });

    // Auth - Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await sbClient.auth.signOut();
        });
    }

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

    // Form Submit (Save Recipe)
    recipeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('recipeTitle').value;
        const category = document.getElementById('recipeCategory').value;
        const ingredients = document.getElementById('recipeIngredients').value;
        const instructions = document.getElementById('recipeInstructions').value;

        // Visual Feedback (disable button)
        const submitBtn = recipeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Speichern...';

        let imageData = null;
        const file = recipeImageInput.files[0];

        try {
            // Upload Image to Supabase Storage if file selected
            if (file) {
                // Ensure unique filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

                const { error: uploadError } = await sbClient.storage
                    .from('recipe-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data } = sbClient.storage
                    .from('recipe-images')
                    .getPublicUrl(fileName);

                imageData = data.publicUrl;
            }

            const newRecipe = {
                title,
                category,
                ingredients,
                instructions,
                imageData,
                user_id: currentUser.id,
                createdAt: Date.now()
            };

            const { error: insertError } = await sbClient
                .from('recipes')
                .insert([newRecipe]);

            if (insertError) throw insertError;

            await loadRecipes();
            closeAddModal();
        } catch (error) {
            alert('Fehler beim Speichern des Rezepts: ' + (error.message || 'Unbekannter Fehler') + '\n\nDetails: ' + JSON.stringify(error));
            console.error("Superbase Save Error:", error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Speichern';
        }
    });

    // Delete Recipe
    deleteRecipeBtn.addEventListener('click', async () => {
        if (currentViewRecipeId && confirm('Möchtest du dieses Rezept wirklich löschen?')) {
            const deleteBtn = document.getElementById('deleteRecipeBtn');
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Löschen...';

            try {
                // Recipe info to delete associated image
                const recipe = recipes.find(r => r.id === currentViewRecipeId);

                // Delete from database
                const { error: deleteError } = await sbClient
                    .from('recipes')
                    .delete()
                    .eq('id', currentViewRecipeId);

                if (deleteError) throw deleteError;

                // Optional: Delete image from Storage
                if (recipe && recipe.imageData) {
                    const urlParts = recipe.imageData.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    // Best effort delete without pausing the app
                    sbClient.storage.from('recipe-images').remove([fileName]).catch(e => console.log("Image cleanup error", e));
                }

                await loadRecipes();
                viewModal.classList.add('hidden');
                currentViewRecipeId = null;
            } catch (error) {
                alert('Fehler beim Löschen des Rezepts.');
                console.error(error);
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Löschen';
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
