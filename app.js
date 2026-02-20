// app.js

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://tdexsgzinjbabiczihwj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xtguokRm66tP1SEwGC-RaQ_ifuZSJ9U';

// Initialize Supabase Client
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let recipes = [];
let folders = [];
let categories = [];
let currentFolderId = 'all';

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

// Folder DOM Elements
const addFolderBtn = document.getElementById('addFolderBtn');
const folderModal = document.getElementById('folderModal');
const closeFolderModalBtn = document.getElementById('closeFolderModalBtn');
const cancelFolderModalBtn = document.getElementById('cancelFolderModalBtn');
const folderForm = document.getElementById('folderForm');
const folderNameInput = document.getElementById('folderName');
const folderList = document.getElementById('folderList');
const recipeFolderSelect = document.getElementById('recipeFolder');

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
const editRecipeBtn = document.getElementById('editRecipeBtn');
const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

let currentViewRecipeId = null;
let editingRecipeId = null;
let isFolderEditMode = false;

// Settings DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const passwordForm = document.getElementById('passwordForm');
const passwordMessage = document.getElementById('passwordMessage');
const categoryForm = document.getElementById('categoryForm');
const newCategoryNameInput = document.getElementById('newCategoryName');
const settingsCategoryList = document.getElementById('settingsCategoryList');

// View State
let currentViewMode = localStorage.getItem('recipeBook_viewMode') || 'grid';
const viewModeSelect = document.getElementById('viewModeSelect');

// Initialize app
async function initApp() {
    setupEventListeners();
    applyViewState();
    await checkUser();
}

async function checkUser() {
    const { data: { session } } = await sbClient.auth.getSession();
    if (session) {
        // Logged in
        currentUser = session.user;
        loginOverlay.classList.add('hidden');
        await loadFolders();
        await loadCategories();
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
            loadFolders().then(() => loadRecipes());
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            loginOverlay.classList.remove('hidden');
            recipes = [];
            folders = [];
            categories = [];
            currentFolderId = 'all';
            renderFolders();
            renderCategories();
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

// Holen der Ordner aus Supabase
async function loadFolders() {
    if (!currentUser) return;

    const { data, error } = await sbClient
        .from('folders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('order_index', { ascending: true })
        .order('createdAt', { ascending: true });

    if (error) {
        console.error("Error loading folders:", error);
        return;
    }

    folders = data;
    renderFolders();
}

// Holen der Kategorien aus Supabase
async function loadCategories() {
    if (!currentUser) return;

    const { data, error } = await sbClient
        .from('categories')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error loading categories:", error);
        return;
    }

    // Seed default categories if user has none
    if (data.length === 0) {
        const defaults = ['Vorspeise', 'Hauptgericht', 'Dessert', 'Backen', 'Getränk'];
        const seedData = defaults.map(name => ({
            name: name,
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        }));

        await sbClient.from('categories').insert(seedData);
        // Reload after seeding
        return await loadCategories();
    }

    categories = data;
    renderCategories();
}

function renderCategories() {
    // Populate Filter Dropdown
    categoryFilter.innerHTML = '<option value="all">Alle Kategorien</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        categoryFilter.appendChild(option);
    });

    // Populate Recipe Form Dropdown
    const recipeCategorySelect = document.getElementById('recipeCategory');
    recipeCategorySelect.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        recipeCategorySelect.appendChild(option);
    });

    renderSettingsCategoryList();
}

function renderSettingsCategoryList() {
    settingsCategoryList.innerHTML = '';
    categories.forEach(cat => {
        const li = document.createElement('li');
        li.className = 'settings-list-item';

        li.innerHTML = `
            <input type="text" class="category-input" value="${cat.name}" data-id="${cat.id}" data-original="${cat.name}">
            <div class="folder-actions" style="display:flex">
                <button class="save-cat-btn hidden" title="Speichern" data-id="${cat.id}"><i class="fa-solid fa-check" style="color:var(--color-primary)"></i></button>
                <button class="delete-cat-btn" title="Löschen" data-id="${cat.id}"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;

        settingsCategoryList.appendChild(li);
    });

    setupCategoryListeners();
}

function setupCategoryListeners() {
    const inputs = settingsCategoryList.querySelectorAll('.category-input');
    const saveBtns = settingsCategoryList.querySelectorAll('.save-cat-btn');
    const deleteBtns = settingsCategoryList.querySelectorAll('.delete-cat-btn');

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const id = input.dataset.id;
            const btn = settingsCategoryList.querySelector(`.save-cat-btn[data-id="${id}"]`);
            if (input.value.trim() !== input.dataset.original) {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        });
    });

    saveBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const input = settingsCategoryList.querySelector(`.category-input[data-id="${id}"]`);
            const newName = input.value.trim();
            const oldName = input.dataset.original;

            if (!newName || newName === oldName) return;

            btn.disabled = true;

            // Update category
            const { error } = await sbClient.from('categories').update({ name: newName }).eq('id', id);

            if (!error) {
                // Cascade update to recipes
                await sbClient.from('recipes').update({ category: newName }).eq('category', oldName);
                await loadCategories();
                await loadRecipes();
            } else {
                alert('Fehler beim Ändern der Kategorie: ' + error.message);
                btn.disabled = false;
            }
        });
    });

    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const input = settingsCategoryList.querySelector(`.category-input[data-id="${id}"]`);

            if (confirm(`Möchtest du die Kategorie "${input.dataset.original}" wirklich löschen? Zugehörige Rezepte behalten den Text, können aber nicht mehr gefiltert werden, bis du sie einer neuen Kategorie zuweist.`)) {
                btn.disabled = true;
                const { error } = await sbClient.from('categories').delete().eq('id', id);
                if (!error) {
                    await loadCategories();
                } else {
                    alert('Fehler beim Löschen: ' + error.message);
                    btn.disabled = false;
                }
            }
        });
    });
}

function renderFolders() {
    const editFoldersBtn = document.getElementById('editFoldersBtn');
    if (editFoldersBtn) {
        if (isFolderEditMode) {
            editFoldersBtn.classList.add('active');
            folderList.classList.add('folder-edit-mode');
        } else {
            editFoldersBtn.classList.remove('active');
            folderList.classList.remove('folder-edit-mode');
        }
    }

    // Reset folder list except the first "All" item
    folderList.innerHTML = `
        <li class="folder-item ${currentFolderId === 'all' ? 'active' : ''}" data-folder-id="all">
            <div class="folder-name-container">
                <i class="fa-solid fa-layer-group"></i> <span>Alle Rezepte</span>
            </div>
        </li>
    `;

    // Reset Dropdown
    recipeFolderSelect.innerHTML = '<option value="">Kein Ordner</option>';

    if (folders) {
        folders.forEach(folder => {
            // Add to Sidebar
            const li = document.createElement('li');
            li.className = `folder-item sortable-folder ${currentFolderId === folder.id ? 'active' : ''}`;
            li.dataset.folderId = folder.id;
            if (isFolderEditMode) {
                li.setAttribute('draggable', 'true');
            }

            li.innerHTML = `
                <div class="folder-name-container">
                    <i class="fa-regular fa-folder"></i>
                    <span title="${folder.name}">${folder.name}</span>
                </div>
                <div class="folder-actions">
                    <button class="delete-folder-btn" title="Ordner löschen" data-id="${folder.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            folderList.appendChild(li);

            // Add to Dropdown
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = folder.name;
            recipeFolderSelect.appendChild(option);
        });
    }

    setupFolderItemListeners();
}

let draggedFolderItem = null;

function setupFolderItemListeners() {
    const editFoldersBtn = document.getElementById('editFoldersBtn');
    if (editFoldersBtn) {
        // Clone and replace to prevent duplicate listeners
        const newBtn = editFoldersBtn.cloneNode(true);
        editFoldersBtn.parentNode.replaceChild(newBtn, editFoldersBtn);
        newBtn.addEventListener('click', () => {
            isFolderEditMode = !isFolderEditMode;
            renderFolders();
        });
    }

    // Sidebar Folder Clicks
    const items = folderList.querySelectorAll('.folder-item');
    items.forEach(item => {
        item.addEventListener('click', (e) => {
            // Ignore logic if we are just editing/sorting folders
            if (isFolderEditMode) return;
            // Ignore if click was on delete button
            if (e.target.closest('.folder-actions')) return;

            currentFolderId = item.dataset.folderId;
            renderFolders(); // Update active class
            renderRecipes(); // Filter recipes
        });
    });

    // Delete Folder clicks
    const deleteBtns = folderList.querySelectorAll('.delete-folder-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm('Möchtest du diesen Ordner wirklich löschen? Zugehörige Rezepte werden NICHT gelöscht, sie landen in "Alle Rezepte".')) {
                const { error } = await sbClient.from('folders').delete().eq('id', id);
                if (!error) {
                    if (currentFolderId === id) currentFolderId = 'all';
                    await sbClient.from('recipes').update({ folder_id: null }).eq('folder_id', id);
                    await loadFolders();
                    await loadRecipes();
                } else {
                    alert('Fehler beim Löschen des Ordners: ' + error.message);
                }
            }
        });
    });

    // Drag and Drop implementation
    const sortableItems = folderList.querySelectorAll('.sortable-folder');
    sortableItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            if (!isFolderEditMode) return;
            draggedFolderItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            sortableItems.forEach(dropItem => dropItem.classList.remove('drag-over'));
            draggedFolderItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!isFolderEditMode || item === draggedFolderItem) return;
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            if (!isFolderEditMode || item === draggedFolderItem || !draggedFolderItem) return;

            // Determine drop position (before or after)
            const bounding = item.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) {
                item.after(draggedFolderItem);
            } else {
                item.before(draggedFolderItem);
            }

            // Save new order
            const currentItems = Array.from(folderList.querySelectorAll('.sortable-folder'));
            const orderUpdates = currentItems.map((li, index) => ({
                id: li.dataset.folderId,
                order_index: index,
                user_id: currentUser.id
            }));

            try {
                // Supabase doesn't have a single bulk update endpoint without an RPC,
                // so we upsert with id array. Given 'id' is unique, upsert acts like an update.
                const { error } = await sbClient.from('folders').upsert(orderUpdates, { onConflict: 'id' });
                if (error) throw error;
                // Reload folders to match new memory state
                await loadFolders();
            } catch (err) {
                console.error("Order save err:", err);
                alert("Fehler beim Speichern der Reihenfolge.");
            }
        });
    });
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
        const matchesFolder = currentFolderId === 'all' || String(recipe.folder_id) === String(currentFolderId);
        return matchesSearch && matchesCategory && matchesFolder;
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

    // Settings Modal & Tabs
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        passwordForm.reset();
        passwordMessage.classList.add('hidden');
    });

    closeSettingsModalBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Settings - Change Password
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('newPassword').value;

        const btn = passwordForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Speichert...';

        const { error } = await sbClient.auth.updateUser({ password: newPass });

        btn.disabled = false;
        btn.textContent = 'Passwort speichern';
        passwordMessage.classList.remove('hidden');

        if (error) {
            passwordMessage.style.color = 'var(--color-accent)';
            passwordMessage.textContent = 'Fehler: ' + error.message;
        } else {
            passwordMessage.style.color = 'var(--color-primary)';
            passwordMessage.textContent = 'Passwort erfolgreich geändert!';
            passwordForm.reset();
        }
    });

    // Settings - Add Category
    categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = newCategoryNameInput.value.trim();
        if (!name) return;

        const btn = categoryForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        const { error } = await sbClient.from('categories').insert([{
            name: name,
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        }]);

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Hinzufügen';

        if (error) {
            alert('Fehler: ' + error.message);
        } else {
            categoryForm.reset();
            await loadCategories();
        }
    });

    // View Options
    viewModeSelect.value = currentViewMode;
    viewModeSelect.addEventListener('change', (e) => {
        currentViewMode = e.target.value;
        applyViewState();
    });

    // Search & Filter
    searchInput.addEventListener('input', renderRecipes);
    categoryFilter.addEventListener('change', renderRecipes);
    sortSelect.addEventListener('change', renderRecipes);

    // Folders
    addFolderBtn.addEventListener('click', () => {
        folderForm.reset();
        folderModal.classList.remove('hidden');
        setTimeout(() => folderNameInput.focus(), 100);
    });

    const closeFolderModal = () => folderModal.classList.add('hidden');
    closeFolderModalBtn.addEventListener('click', closeFolderModal);
    cancelFolderModalBtn.addEventListener('click', closeFolderModal);

    folderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = folderNameInput.value.trim();
        if (!name) return;

        const btn = folderForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Speichert...';

        const { error } = await sbClient.from('folders').insert([{
            name: name,
            user_id: currentUser.id,
            createdAt: Date.now()
        }]);

        btn.disabled = false;
        btn.textContent = 'Erstellen';

        if (error) {
            alert('Fehler beim Erstellen des Ordners: ' + error.message);
        } else {
            closeFolderModal();
            await loadFolders();
        }
    });

    // Add / Edit Modal
    addRecipeBtn.addEventListener('click', () => {
        editingRecipeId = null;
        recipeForm.reset();
        document.getElementById('modalTitle').textContent = 'Neues Rezept hinzufügen';
        recipeFolderSelect.value = currentFolderId === 'all' ? '' : currentFolderId;
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

    // Edit Recipe
    editRecipeBtn.addEventListener('click', () => {
        if (!currentViewRecipeId) return;
        const recipe = recipes.find(r => r.id === currentViewRecipeId);
        if (!recipe) return;

        viewModal.classList.add('hidden');
        editingRecipeId = recipe.id;
        document.getElementById('modalTitle').textContent = 'Rezept bearbeiten';

        // Populate Form
        document.getElementById('recipeTitle').value = recipe.title;
        document.getElementById('recipeCategory').value = recipe.category;
        document.getElementById('recipeFolder').value = recipe.folder_id || '';
        document.getElementById('recipeIngredients').value = recipe.ingredients;
        document.getElementById('recipeInstructions').value = recipe.instructions;

        if (recipe.imageData) {
            imagePreview.innerHTML = `<img src="${recipe.imageData}" alt="${recipe.title}">`;
        } else {
            imagePreview.innerHTML = '<span>Bild auswählen</span>';
        }

        recipeModal.classList.remove('hidden');
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
        const folder_id = document.getElementById('recipeFolder').value || null;
        const ingredients = document.getElementById('recipeIngredients').value;
        const instructions = document.getElementById('recipeInstructions').value;

        // Visual Feedback (disable button)
        const submitBtn = recipeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Speichern...';

        let imageData = null;
        // Keep old image if editing and no new file selected
        if (editingRecipeId) {
            const oldRecipe = recipes.find(r => r.id === editingRecipeId);
            if (oldRecipe) imageData = oldRecipe.imageData;
        }

        const file = recipeImageInput.files[0];

        try {
            // Upload Image to Supabase Storage if new file selected
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

            const recipeData = {
                title,
                category,
                folder_id,
                ingredients,
                instructions,
                imageData,
                user_id: currentUser.id
            };

            let saveError = null;

            if (editingRecipeId) {
                // Update existing
                const { error } = await sbClient
                    .from('recipes')
                    .update(recipeData)
                    .eq('id', editingRecipeId);
                saveError = error;
            } else {
                // Insert new
                recipeData.createdAt = Date.now();
                const { error } = await sbClient
                    .from('recipes')
                    .insert([recipeData]);
                saveError = error;
            }

            if (saveError) throw saveError;

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
        if (e.target === folderModal) closeFolderModal();
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
            passwordMessage.classList.add('hidden');
        }
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

function applyViewState() {
    localStorage.setItem('recipeBook_viewMode', currentViewMode);

    // Reset classes
    recipeGrid.classList.remove('list-view', 'small-grid');

    if (currentViewMode === 'list') {
        recipeGrid.classList.add('list-view');
    } else if (currentViewMode === 'small-grid') {
        recipeGrid.classList.add('small-grid');
    }
}

// Boot up
document.addEventListener('DOMContentLoaded', initApp);
