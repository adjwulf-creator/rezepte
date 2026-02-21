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

let currentLang = localStorage.getItem('appLang') || 'de';

function t(key) {
    if (!window.translations || !window.translations[currentLang]) return key;
    return window.translations[currentLang][key] || key;
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });

    document.documentElement.lang = currentLang;

    // Resync select headers
    if (sortSelectHeader) {
        const activeSort = sortSelectDropdown?.querySelector('.multi-select-option.active span');
        if (activeSort) sortSelectHeader.querySelector('span').textContent = activeSort.textContent;
    }
    if (viewModeHeader) {
        const activeView = viewModeDropdown?.querySelector('.multi-select-option.active span');
        if (activeView) viewModeHeader.querySelector('span').textContent = activeView.textContent;
    }

    updateFilterHeader();
}

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
const appHeaderTitle = document.getElementById('appHeaderTitle');
const loginAppTitle = document.getElementById('loginAppTitle');

let isLoginMode = true; // Toggle between login and register
let currentUser = null;

const recipeGrid = document.getElementById('recipeGrid');
const emptyState = document.getElementById('emptyState');

// Layout DOM Elements
const mobileFoldersBtn = document.getElementById('mobileFoldersBtn');
const mobileControlsBtn = document.getElementById('mobileControlsBtn');
const mobileDropdownFolders = document.getElementById('mobileDropdownFolders');
const mobileDropdownControls = document.getElementById('mobileDropdownControls');
const contentArea = document.getElementById('contentArea');
const recipeControls = document.getElementById('recipeControls');
const sidebar = document.getElementById('sidebar');

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
const categoryFilterContainer = document.getElementById('categoryFilterContainer');
const categoryFilterHeader = document.getElementById('categoryFilterHeader');
const categoryFilterDropdown = document.getElementById('categoryFilterDropdown');
const sortSelectHeader = document.getElementById('sortSelectHeader');
const sortSelectDropdown = document.getElementById('sortSelectDropdown');
const sortSelectContainer = document.getElementById('sortSelectContainer');

const viewModal = document.getElementById('viewModal');
const closeViewModalBtn = document.getElementById('closeViewModalBtn');
const viewRecipeDetails = document.getElementById('viewRecipeDetails');
const editRecipeBtn = document.getElementById('editRecipeBtn');
const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

let currentViewRecipeId = null;
let editingRecipeId = null;
let isFolderEditMode = false;
let currentRecipeImages = []; // Array of { url: string, file: File, isDefault: boolean }

// Settings DOM Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const appNameForm = document.getElementById('appNameForm');
const appNameInput = document.getElementById('appNameInput');
const appNameMessage = document.getElementById('appNameMessage');
const passwordForm = document.getElementById('passwordForm');
const passwordMessage = document.getElementById('passwordMessage');
const categoryForm = document.getElementById('categoryForm');
const newCategoryNameInput = document.getElementById('newCategoryName');
const settingsCategoryList = document.getElementById('settingsCategoryList');
const languageSelect = document.getElementById('languageSelect');

// View State
let currentViewMode = localStorage.getItem('recipeBook_viewMode') || 'grid';
const viewModeHeader = document.getElementById('viewModeHeader');
const viewModeDropdown = document.getElementById('viewModeDropdown');
const viewModeContainer = document.getElementById('viewModeContainer');

// Responsive Layout Handlers
function adaptMobileLayout() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        if (sidebar && sidebar.parentElement !== mobileDropdownFolders) {
            mobileDropdownFolders.appendChild(sidebar);
            mobileDropdownControls.appendChild(recipeControls);
        }
    } else {
        if (sidebar && sidebar.parentElement !== contentArea.parentElement) {
            contentArea.parentElement.insertBefore(sidebar, contentArea);
            contentArea.insertBefore(recipeControls, contentArea.firstElementChild);
            mobileDropdownFolders.classList.add('hidden');
            mobileDropdownControls.classList.add('hidden');
        }
    }
}

window.addEventListener('resize', adaptMobileLayout);
if (mobileFoldersBtn && mobileControlsBtn) {
    function positionDropdown(dropdown) {
        const header = document.querySelector('.app-header');
        if (header) {
            dropdown.style.top = header.offsetHeight + 'px';
            dropdown.style.maxHeight = 'calc(100dvh - ' + header.offsetHeight + 'px)';
        }
    }
    mobileFoldersBtn.addEventListener('click', () => {
        mobileDropdownFolders.classList.toggle('hidden');
        mobileDropdownControls.classList.add('hidden');
        const foldersOpen = !mobileDropdownFolders.classList.contains('hidden');
        if (foldersOpen) positionDropdown(mobileDropdownFolders);
        document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
    });

    mobileControlsBtn.addEventListener('click', () => {
        mobileDropdownControls.classList.toggle('hidden');
        mobileDropdownFolders.classList.add('hidden');
        const controlsOpen = !mobileDropdownControls.classList.contains('hidden');
        if (controlsOpen) positionDropdown(mobileDropdownControls);
        if (!controlsOpen) {
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
        }
    });

    // Observer to handle body scroll lock and blur effect when dropdowns or modals are open
    const overlayObserver = new MutationObserver(() => {
        const foldersOpen = mobileDropdownFolders && !mobileDropdownFolders.classList.contains('hidden');
        const controlsOpen = mobileDropdownControls && !mobileDropdownControls.classList.contains('hidden');

        if (foldersOpen || controlsOpen) {
            document.body.classList.add('mobile-dropdown-active');
        } else {
            document.body.classList.remove('mobile-dropdown-active');
        }

        // Robustly synchronize the button icons with the actual dropdown hidden states
        if (mobileFoldersBtn) {
            const icon = mobileFoldersBtn.querySelector('i');
            if (foldersOpen) {
                if (icon) icon.className = 'fa-solid fa-xmark';
                mobileFoldersBtn.classList.add('active-dropdown-btn');
            } else {
                if (icon) icon.className = 'fa-regular fa-folder-open';
                mobileFoldersBtn.classList.remove('active-dropdown-btn');
            }
        }

        if (mobileControlsBtn) {
            const icon = mobileControlsBtn.querySelector('i');
            if (controlsOpen) {
                if (icon) icon.className = 'fa-solid fa-xmark';
                mobileControlsBtn.classList.add('active-dropdown-btn');
            } else {
                if (icon) icon.className = 'fa-solid fa-sliders';
                mobileControlsBtn.classList.remove('active-dropdown-btn');
            }
        }


        const openModal = document.querySelector('.modal:not(.hidden)');
        if (openModal) {
            document.body.classList.add('modal-active');
        } else {
            document.body.classList.remove('modal-active');
        }
    });

    if (mobileDropdownFolders) overlayObserver.observe(mobileDropdownFolders, { attributes: true, attributeFilter: ['class'] });
    if (mobileDropdownControls) overlayObserver.observe(mobileDropdownControls, { attributes: true, attributeFilter: ['class'] });

    // Also observe all modals
    document.querySelectorAll('.modal').forEach(modal => {
        overlayObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
}

// isTouchScrolling flag for iOS Safari phantom click prevention
let isTouchScrolling = false;
document.addEventListener('touchmove', () => { isTouchScrolling = true; }, { passive: true });
document.addEventListener('touchstart', () => { isTouchScrolling = false; }, { passive: true });

// Close mobile dropdowns when clicking outside the header (capture phase to intercept before other handlers)
document.addEventListener('click', (e) => {
    const foldersOpen = mobileDropdownFolders && !mobileDropdownFolders.classList.contains('hidden');
    const controlsOpen = mobileDropdownControls && !mobileDropdownControls.classList.contains('hidden');
    if (!foldersOpen && !controlsOpen) return;

    // Check if click is inside the header or dropdowns
    const header = document.querySelector('.app-header');
    if (header && header.contains(e.target)) return;
    if (mobileDropdownFolders && mobileDropdownFolders.contains(e.target)) return;
    if (mobileDropdownControls && mobileDropdownControls.contains(e.target)) return;

    // Close dropdowns (icon states are synchronized by the MutationObserver)
    if (foldersOpen) {
        mobileDropdownFolders.classList.add('hidden');
    }
    if (controlsOpen) {
        mobileDropdownControls.classList.add('hidden');
    }
    e.stopPropagation();
    e.preventDefault();
}, true);

// Initialize app
async function initApp() {
    adaptMobileLayout();

    if (languageSelect) {
        languageSelect.value = currentLang;
        languageSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('appLang', currentLang);
            applyLanguage();
            // Re-render components with dynamic translated text
            applyAppName(currentUser?.user_metadata?.app_name);
            renderFolders();
            renderRecipes();
        });
    }

    applyLanguage(); // Execute initial
    setupEventListeners();
    applyViewState();
    await checkUser();
}

function applyAppName(name) {
    const defaultName = t("app_title");
    const displayName = name && name.trim() !== '' ? name.trim() : defaultName;
    if (appHeaderTitle) appHeaderTitle.textContent = displayName;
    if (loginAppTitle) loginAppTitle.textContent = displayName;
    document.title = displayName;
}

async function checkUser() {
    const { data: { session } } = await sbClient.auth.getSession();
    if (session) {
        // Logged in
        currentUser = session.user;
        applyAppName(currentUser.user_metadata?.app_name);
        loginOverlay.classList.add('hidden');
        await loadFolders();
        await loadCategories();
        await loadRecipes();
    } else {
        // Not logged in
        currentUser = null;
        applyAppName(null);
        loginOverlay.classList.remove('hidden');
    }

    // Listen for auth changes
    sbClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            applyAppName(currentUser.user_metadata?.app_name);
            loginOverlay.classList.add('hidden');
            loadFolders().then(() => loadRecipes());
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            applyAppName(null);
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
        .order('order_index', { ascending: true })
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
    // Populate Filter multi-select dropdown
    if (categoryFilterDropdown) {
        categoryFilterDropdown.innerHTML = '';
        categories.forEach(cat => {
            const label = document.createElement('label');
            label.className = 'multi-select-option';
            label.innerHTML = `<input type="checkbox" value="${cat.name}"><span>${cat.name}</span>`;
            label.querySelector('input').addEventListener('change', () => {
                updateFilterHeader();
                renderRecipes();
            });
            categoryFilterDropdown.appendChild(label);
        });
    }

    // Toggle filter dropdown open/close
    if (categoryFilterHeader && !categoryFilterHeader._hasListener) {
        categoryFilterHeader._hasListener = true;

        categoryFilterHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.multi-select-dropdown').forEach(d => {
                if (d !== categoryFilterDropdown) d.classList.add('hidden');
            });
            categoryFilterDropdown.classList.toggle('hidden');
        });
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (categoryFilterContainer && !categoryFilterContainer.contains(e.target)) {
                categoryFilterDropdown.classList.add('hidden');
            }
        });
    }

    // Populate Recipe Form checkbox grid
    const checkboxGrid = document.getElementById('recipeCategoryCheckboxes');
    if (checkboxGrid) {
        checkboxGrid.innerHTML = '';
        categories.forEach(cat => {
            const label = document.createElement('label');
            const id = `cat-cb-${cat.name.replace(/\s+/g, '-')}`;
            label.innerHTML = `<input type="checkbox" id="${id}" value="${cat.name}"><span>${cat.name}</span>`;
            checkboxGrid.appendChild(label);
        });
    }

    renderSettingsCategoryList();
}

function updateFilterHeader() {
    if (!categoryFilterHeader) return;
    const checked = Array.from(categoryFilterDropdown.querySelectorAll('input:checked')).map(i => i.value);
    const span = categoryFilterHeader.querySelector('span');
    if (checked.length === 0) {
        span.textContent = t('filter_category');
        if (mobileControlsBtn) mobileControlsBtn.classList.remove('has-active-filters');
    } else {
        span.textContent = checked.join(', ');
        if (mobileControlsBtn) mobileControlsBtn.classList.add('has-active-filters');
    }
}

function getSelectedFilterCategories() {
    if (!categoryFilterDropdown) return [];
    return Array.from(categoryFilterDropdown.querySelectorAll('input:checked')).map(i => i.value);
}

function getCurrentSortValue() {
    if (!sortSelectDropdown) return 'newest';
    const active = sortSelectDropdown.querySelector('.multi-select-option.active');
    return active ? active.dataset.value : 'newest';
}

function setupSingleSelectDropdown(header, dropdown, container, initialValue, onChange) {
    if (!header || !dropdown) return;

    // Set initial active
    const initialOption = dropdown.querySelector(`.multi-select-option[data-value="${initialValue}"]`);
    if (initialOption) {
        dropdown.querySelectorAll('.multi-select-option').forEach(o => o.classList.remove('active'));
        initialOption.classList.add('active');
        header.querySelector('span').textContent = initialOption.querySelector('span').textContent;
    }

    // Toggle dropdown
    header.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close other custom dropdowns
        document.querySelectorAll('.multi-select-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
    });

    // Option click = select + close
    dropdown.querySelectorAll('.multi-select-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.querySelectorAll('.multi-select-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            header.querySelector('span').textContent = option.querySelector('span').textContent;
            dropdown.classList.add('hidden');
            if (onChange) onChange(option.dataset.value);

            // If we are on mobile, also close the entire controls dropdown (icon sync handled by MutationObserver)
            if (mobileDropdownControls && !mobileDropdownControls.classList.contains('hidden')) {
                mobileDropdownControls.classList.add('hidden');
            }
        });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (container && !container.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
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

            // Update category name in categories table
            const { error } = await sbClient.from('categories').update({ name: newName }).eq('id', id);

            if (!error) {
                // Cascade update: replace oldName within comma-separated category strings
                const { data: affectedRecipes } = await sbClient
                    .from('recipes')
                    .select('id, category')
                    .eq('user_id', currentUser.id);

                if (affectedRecipes) {
                    const updates = affectedRecipes
                        .filter(r => r.category && r.category.split(',').map(c => c.trim()).includes(oldName))
                        .map(r => ({
                            id: r.id,
                            category: r.category.split(',').map(c => c.trim() === oldName ? newName : c.trim()).join(',')
                        }));
                    for (const upd of updates) {
                        await sbClient.from('recipes').update({ category: upd.category }).eq('id', upd.id);
                    }
                }

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
            const nameToDelete = input.dataset.original;

            if (confirm(t('confirm_delete_category').replace('{name}', nameToDelete))) {
                btn.disabled = true;
                const { error } = await sbClient.from('categories').delete().eq('id', id);
                if (!error) {
                    // Remove deleted category from all recipe category strings
                    const { data: affectedRecipes } = await sbClient
                        .from('recipes')
                        .select('id, category')
                        .eq('user_id', currentUser.id);

                    if (affectedRecipes) {
                        const updates = affectedRecipes
                            .filter(r => r.category && r.category.split(',').map(c => c.trim()).includes(nameToDelete))
                            .map(r => ({
                                id: r.id,
                                category: r.category.split(',').map(c => c.trim()).filter(c => c !== nameToDelete).join(',')
                            }));
                        for (const upd of updates) {
                            await sbClient.from('recipes').update({ category: upd.category }).eq('id', upd.id);
                        }
                    }

                    await loadCategories();
                    await loadRecipes();
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
                <i class="fa-solid fa-layer-group"></i> <span data-i18n="all_recipes">${t('all_recipes')}</span>
            </div>
        </li>
    `;

    // Reset Dropdown
    recipeFolderSelect.innerHTML = `<option value="">${t('no_folder')}</option>`;

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

    // Update Active Folder Breadcrumb Display
    const activeFolderDisplay = document.getElementById('activeFolderDisplay');
    const activeFolderName = document.getElementById('activeFolderName');

    if (activeFolderDisplay && activeFolderName) {
        if (currentFolderId === 'all') {
            activeFolderDisplay.classList.add('hidden');
        } else {
            const currentFolder = folders.find(f => String(f.id) === String(currentFolderId));
            if (currentFolder) {
                activeFolderName.textContent = currentFolder.name;
                activeFolderDisplay.classList.remove('hidden');
            } else {
                activeFolderDisplay.classList.add('hidden');
            }
        }
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
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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
            if (mobileDropdownFolders) {
                mobileDropdownFolders.classList.add('hidden');
                if (mobileFoldersBtn) {
                    const icon = mobileFoldersBtn.querySelector('i');
                    if (icon) icon.className = 'fa-regular fa-folder-open';
                    mobileFoldersBtn.classList.remove('active-dropdown-btn');
                }
            }
        });
    });

    // Breadcrumb Home Click
    const breadcrumbHome = document.getElementById('breadcrumbHome');
    if (breadcrumbHome) {
        // Remove old listeners to prevent duplicates on re-render
        const newBreadcrumbHome = breadcrumbHome.cloneNode(true);
        breadcrumbHome.parentNode.replaceChild(newBreadcrumbHome, breadcrumbHome);
        newBreadcrumbHome.addEventListener('click', () => {
            if (isFolderEditMode) return;
            currentFolderId = 'all';
            renderFolders();
            renderRecipes();
        });
    }

    // Delete Folder clicks
    const deleteBtns = folderList.querySelectorAll('.delete-folder-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            if (confirm(t('confirm_delete_folder'))) {
                const { error } = await sbClient.from('folders').delete().eq('id', id);
                if (!error) {
                    if (currentFolderId === id) currentFolderId = 'all';
                    await sbClient.from('recipes').update({ folder_id: null }).eq('folder_id', id);
                    await loadFolders();
                    await loadRecipes();
                } else {
                    alert(t('err_delete_folder') + error.message);
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
            // Recipe drop logic
            if (draggedRecipeCard) {
                e.preventDefault();
                item.classList.add('recipe-drag-over');
                return;
            }

            // Folder sort logic
            e.preventDefault();
            if (!isFolderEditMode || item === draggedFolderItem) return;
            if (!item.classList.contains('sortable-folder')) return;
            e.dataTransfer.dropEffect = 'move';
            item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
            item.classList.remove('recipe-drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            item.classList.remove('recipe-drag-over');

            // Handling Recipe Drop onto Folder
            if (draggedRecipeCard) {
                const recipeId = draggedRecipeCard.dataset.id;
                const targetFolderId = item.dataset.folderId === 'all' ? null : item.dataset.folderId;

                try {
                    const { error } = await sbClient.from('recipes')
                        .update({ folder_id: targetFolderId })
                        .eq('id', recipeId);

                    if (error) throw error;

                    // Update local state and UI
                    const recipe = recipes.find(r => r.id == recipeId);
                    if (recipe) recipe.folder_id = targetFolderId;
                    renderRecipes(); // Re-render to potentially remove from current view
                } catch (err) {
                    console.error("Error moving recipe to folder:", err);
                    alert("Fehler beim Verschieben des Rezepts.");
                }
                return;
            }

            // Handling Folder Sort logic
            if (!isFolderEditMode || item === draggedFolderItem || !draggedFolderItem) return;
            if (!item.classList.contains('sortable-folder')) return;

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
    const selectedCategories = getSelectedFilterCategories();
    const sortBy = getCurrentSortValue();

    // Filter
    let filteredRecipes = recipes.filter(recipe => {
        const matchesSearch = recipe.title.toLowerCase().includes(searchTerm) ||
            (recipe.ingredients || '').toLowerCase().includes(searchTerm);
        // AND logic: recipe must contain ALL selected filter categories
        const recipeCategories = (recipe.category || '').split(',').map(c => c.trim()).filter(Boolean);
        const matchesCategory = selectedCategories.length === 0 ||
            selectedCategories.every(sel => recipeCategories.includes(sel));
        const matchesFolder = currentFolderId === 'all' || String(recipe.folder_id) === String(currentFolderId);
        return matchesSearch && matchesCategory && matchesFolder;
    });

    // Sort
    filteredRecipes.sort((a, b) => {
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'za') return b.title.localeCompare(a.title);
        if (sortBy === 'manual') return (a.order_index || 0) - (b.order_index || 0);
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
            card.className = 'recipe-card draggable';
            card.setAttribute('draggable', 'true');
            card.dataset.id = recipe.id;

            const imageHtml = recipe.imageData
                ? `<img src="${recipe.imageData}" alt="${recipe.title}">`
                : `<i class="fa-solid fa-utensils"></i>`;

            const recipeCategories = (recipe.category || '').split(',').map(c => c.trim()).filter(Boolean);
            const tagsHtml = recipeCategories.length > 0
                ? `<div class="recipe-tags-container">${recipeCategories.map(c => `<span class="recipe-tag"><i class="fa-solid fa-tag"></i> ${c}</span>`).join('')}</div>`
                : '';

            card.innerHTML = `
                <div class="card-img-container">
                    ${imageHtml}
                </div>
                <div class="card-content">
                    <h3>${recipe.title}</h3>
                    ${tagsHtml}
                    <p class="recipe-description">${recipe.ingredients}</p>
                </div>
            `;

            // Allow opening modal on click, but not if dragging
            card.addEventListener('click', (e) => {
                if (card.classList.contains('dragging')) return;
                openViewModal(recipe);
            });

            recipeGrid.appendChild(card);
        });

        setupRecipeDragListeners();
    }
}

let draggedRecipeCard = null;

function setupRecipeDragListeners() {
    const cards = recipeGrid.querySelectorAll('.recipe-card.draggable');
    if (cards.length === 0) return;

    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedRecipeCard = card;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            cards.forEach(c => c.classList.remove('drag-over'));
            draggedRecipeCard = null;
        });

        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (getCurrentSortValue() !== 'manual' || card === draggedRecipeCard) return;
            e.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', async (e) => {
            e.preventDefault();
            card.classList.remove('drag-over');
            if (getCurrentSortValue() !== 'manual' || card === draggedRecipeCard || !draggedRecipeCard) return;

            // Determine drop position based on mouse vertical/horizontal position
            const bounding = card.getBoundingClientRect();
            // Checking horizontal offset for grids
            const offset = bounding.x + (bounding.width / 2);
            if (e.clientX - offset > 0) {
                card.after(draggedRecipeCard);
            } else {
                card.before(draggedRecipeCard);
            }

            // Save new order
            const currentCards = Array.from(recipeGrid.querySelectorAll('.recipe-card'));
            const orderUpdates = currentCards.map((c, index) => ({
                id: c.dataset.id,
                order_index: index,
                user_id: currentUser.id
            }));

            // Sync with local array immediately for snappier UI
            orderUpdates.forEach(update => {
                const recipe = recipes.find(r => r.id == update.id);
                if (recipe) recipe.order_index = update.order_index;
            });

            try {
                const { error } = await sbClient.from('recipes').upsert(orderUpdates, { onConflict: 'id', ignoreDuplicates: false });
                if (error) throw error;
            } catch (err) {
                console.error("Recipe order save err:", err);
                alert("Fehler beim Speichern der Reihenfolge.");
                await loadRecipes(); // Revert to database state on error
            }
        });
    });
}

// Setup all event listeners
function setupEventListeners() {
    // Close mobile dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        const isClickInsideFoldersBtn = mobileFoldersBtn && mobileFoldersBtn.contains(e.target);
        const isClickInsideControlsBtn = mobileControlsBtn && mobileControlsBtn.contains(e.target);
        const isClickInsideFoldersDropdown = mobileDropdownFolders && mobileDropdownFolders.contains(e.target);
        const isClickInsideControlsDropdown = mobileDropdownControls && mobileDropdownControls.contains(e.target);

        if (!isClickInsideFoldersBtn && !isClickInsideFoldersDropdown && mobileDropdownFolders) {
            mobileDropdownFolders.classList.add('hidden');
        }
        if (!isClickInsideControlsBtn && !isClickInsideControlsDropdown && mobileDropdownControls) {
            mobileDropdownControls.classList.add('hidden');
        }
    });

    // Auth - Toggle Mode
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        loginError.classList.add('hidden');

        const loginBox = document.querySelector('.login-box');

        if (isLoginMode) {
            loginBox.classList.remove('register-mode');
            authMainTitle.textContent = t('login_title');
            loginSubtitle.textContent = t('login_subtitle');
            authSubmitBtn.textContent = t('btn_login');
            authToggleText.textContent = t('no_account');
            authToggleLink.textContent = t('btn_register');
        } else {
            loginBox.classList.add('register-mode');
            authMainTitle.textContent = t('register_title');
            loginSubtitle.textContent = t('register_subtitle');
            authSubmitBtn.textContent = t('btn_register_submit');
            authToggleText.textContent = t('has_account');
            authToggleLink.textContent = t('has_account_link');
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
        authSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

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
                alert(t('msg_register_success'));
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
            if (settingsModal) settingsModal.classList.add('hidden');
            await sbClient.auth.signOut();
        });
    }

    // Settings Modal & Tabs
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        passwordMessage.classList.add('hidden');
        appNameMessage.classList.add('hidden');
        appNameInput.value = currentUser?.user_metadata?.app_name || '';
    });

    // Settings - Update App Name
    appNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = appNameInput.value.trim();

        const btn = appNameForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Speichert...';

        const { data, error } = await sbClient.auth.updateUser({
            data: { app_name: newName }
        });

        btn.disabled = false;
        btn.textContent = 'Name speichern';
        appNameMessage.classList.remove('hidden');

        if (error) {
            appNameMessage.style.color = 'var(--color-accent)';
            appNameMessage.textContent = 'Fehler: ' + error.message;
        } else {
            currentUser = data.user;
            applyAppName(currentUser.user_metadata?.app_name);
            appNameMessage.style.color = 'var(--color-primary)';
            appNameMessage.textContent = 'Name erfolgreich geändert!';
        }
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

    // View Options — custom dropdown
    setupSingleSelectDropdown(viewModeHeader, viewModeDropdown, viewModeContainer, currentViewMode, (val) => {
        currentViewMode = val;
        applyViewState();
    });

    // Search & Filter
    searchInput.addEventListener('input', renderRecipes);
    // Note: Category filter change events are handled in renderCategories() via checkbox listeners

    // Sort — custom dropdown
    setupSingleSelectDropdown(sortSelectHeader, sortSelectDropdown, sortSelectContainer, 'newest', (val) => {
        renderRecipes();
    });

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
        // Uncheck all category checkboxes
        document.querySelectorAll('#recipeCategoryCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('modalTitle').textContent = t('add_recipe_title');
        recipeFolderSelect.value = currentFolderId === 'all' ? '' : currentFolderId;
        currentRecipeImages = [];
        renderImagePreviewGrid();
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
        document.getElementById('modalTitle').textContent = t('edit_recipe_title') || 'Rezept bearbeiten';

        // Populate Form
        document.getElementById('recipeTitle').value = recipe.title;
        // Pre-check the categories for this recipe
        const savedCategories = (recipe.category || '').split(',').map(c => c.trim()).filter(Boolean);
        document.querySelectorAll('#recipeCategoryCheckboxes input[type="checkbox"]').forEach(cb => {
            cb.checked = savedCategories.includes(cb.value);
        });
        document.getElementById('recipeFolder').value = recipe.folder_id || '';
        document.getElementById('recipeIngredients').value = recipe.ingredients;
        document.getElementById('recipeInstructions').value = recipe.instructions;

        if (recipe.images && recipe.images.length > 0) {
            currentRecipeImages = recipe.images.map(url => ({
                url: url,
                file: null,
                isDefault: recipe.imageData === url
            }));
            // Fallback if imageData somehow doesn't match any image in array
            if (!currentRecipeImages.some(img => img.isDefault)) {
                currentRecipeImages[0].isDefault = true;
            }
        } else if (recipe.imageData) {
            // Legacy support for recipes with single imageData but no images array
            currentRecipeImages = [{
                url: recipe.imageData,
                file: null,
                isDefault: true
            }];
        } else {
            currentRecipeImages = [];
        }

        renderImagePreviewGrid();

        recipeModal.classList.remove('hidden');
    });

    // Image Upload Preview Logic
    let draggedImagePreviewIndex = null;

    function renderImagePreviewGrid() {
        imagePreview.innerHTML = '';
        if (currentRecipeImages.length === 0) {
            imagePreview.innerHTML = `<span>${t('no_images')}</span>`;
            return;
        }

        // Ensure exactly one default image if there are any images
        if (currentRecipeImages.length > 0 && !currentRecipeImages.some(img => img.isDefault)) {
            currentRecipeImages[0].isDefault = true;
        }

        currentRecipeImages.forEach((imgObj, index) => {
            const div = document.createElement('div');
            div.className = `image-preview-item ${imgObj.isDefault ? 'is-default' : ''}`;

            // Drag and Drop Logic
            div.setAttribute('draggable', 'true');

            div.addEventListener('dragstart', (e) => {
                draggedImagePreviewIndex = index;
                div.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
                const items = imagePreview.querySelectorAll('.image-preview-item');
                items.forEach(c => c.classList.remove('drag-over'));
                draggedImagePreviewIndex = null;
            });

            div.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedImagePreviewIndex === null || draggedImagePreviewIndex === index) return;
                e.dataTransfer.dropEffect = 'move';
                div.classList.add('drag-over');
            });

            div.addEventListener('dragleave', () => {
                div.classList.remove('drag-over');
            });

            div.addEventListener('drop', (e) => {
                e.preventDefault();
                div.classList.remove('drag-over');
                if (draggedImagePreviewIndex === null || draggedImagePreviewIndex === index) return;

                // Reorder array
                const draggedItem = currentRecipeImages.splice(draggedImagePreviewIndex, 1)[0];
                currentRecipeImages.splice(index, 0, draggedItem);

                renderImagePreviewGrid();
            });

            const img = document.createElement('img');
            if (imgObj.file) {
                // Object URL for local files
                img.src = URL.createObjectURL(imgObj.file);
            } else {
                img.src = imgObj.url;
            }

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-img-btn';
            removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                currentRecipeImages.splice(index, 1);
                renderImagePreviewGrid();
            };

            const defaultBadge = document.createElement('div');
            defaultBadge.className = 'default-badge';
            defaultBadge.innerHTML = '<i class="fa-solid fa-star"></i>';
            defaultBadge.title = imgObj.isDefault ? "Standardbild" : "Als Standardbild setzen";
            defaultBadge.onclick = (e) => {
                e.stopPropagation();
                currentRecipeImages.forEach(img => img.isDefault = false);
                imgObj.isDefault = true;
                renderImagePreviewGrid();
            };

            div.appendChild(img);
            div.appendChild(removeBtn);
            div.appendChild(defaultBadge);
            imagePreview.appendChild(div);
        });
    }

    recipeImageInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            currentRecipeImages.push({
                file: file,
                url: null,
                isDefault: currentRecipeImages.length === 0 // First image is default natively
            });
        });

        // Reset input so same file can be selected again if needed
        recipeImageInput.value = '';
        renderImagePreviewGrid();
    });

    // Form Submit (Save Recipe)
    recipeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('recipeTitle').value;
        const checkedBoxes = document.querySelectorAll('#recipeCategoryCheckboxes input:checked');
        const category = Array.from(checkedBoxes).map(cb => cb.value).join(',');
        const folder_id = document.getElementById('recipeFolder').value || null;
        const ingredients = document.getElementById('recipeIngredients').value;
        const instructions = document.getElementById('recipeInstructions').value;

        // Visual Feedback (disable button)
        const submitBtn = recipeForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Speichern...';

        try {
            // 1. Upload new image files
            const uploadedUrls = [];
            let updatedDefaultUrl = null;

            for (const imgObj of currentRecipeImages) {
                if (imgObj.file) {
                    const fileExt = imgObj.file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

                    const { error: uploadError } = await sbClient.storage
                        .from('recipe-images')
                        .upload(fileName, imgObj.file);

                    if (uploadError) throw uploadError;

                    const { data } = sbClient.storage
                        .from('recipe-images')
                        .getPublicUrl(fileName);

                    imgObj.url = data.publicUrl;
                }

                uploadedUrls.push(imgObj.url);
                if (imgObj.isDefault) {
                    updatedDefaultUrl = imgObj.url;
                }
            }

            const recipeData = {
                title,
                category,
                folder_id,
                ingredients,
                instructions,
                images: uploadedUrls,
                imageData: updatedDefaultUrl, // Maintain backward compatibility
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
                alert(t('err_delete_recipe') || 'Fehler beim Löschen des Rezepts.');
                console.error(error);
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Löschen';
            }
        }
    });

    // Close modals on outside click (desktop only)
    // On mobile, modals are fullscreen so there's no backdrop to click.
    // iOS Safari also fires phantom clicks during scroll gestures which would close modals.
    window.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) return;
        if (e.target === recipeModal) closeAddModal();
        if (e.target === viewModal) viewModal.classList.add('hidden');
        if (e.target === folderModal) closeFolderModal();
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
            passwordMessage.classList.add('hidden');
        }
        if (e.target === lightboxModal) closeLightbox();
    });

    // Lightbox Controls
    lightboxCloseBtn.addEventListener('click', closeLightbox);

    lightboxPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prevLightboxImage();
    });

    lightboxNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextLightboxImage();
    });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
        if (!lightboxModal.classList.contains('hidden')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextLightboxImage();
            if (e.key === 'ArrowLeft') prevLightboxImage();
        }
    });
}

// Open Recipe View Modal
function openViewModal(recipe) {
    currentViewRecipeId = recipe.id;

    // Set up images for gallery and lightbox
    currentLightboxImages = recipe.images && recipe.images.length > 0
        ? recipe.images
        : (recipe.imageData ? [recipe.imageData] : []);

    // The main image is either the first in the array or the explicit standard image
    let initialMainImageUrl = recipe.imageData || (currentLightboxImages.length > 0 ? currentLightboxImages[0] : null);
    // Find index of the main image for the lightbox
    currentLightboxIndex = currentLightboxImages.indexOf(initialMainImageUrl) >= 0
        ? currentLightboxImages.indexOf(initialMainImageUrl)
        : 0;

    const mainImageHtml = initialMainImageUrl
        ? `<img src="${initialMainImageUrl}" alt="${recipe.title}" class="recipe-detail-image" id="mainRecipeViewImage" onclick="openLightbox(${currentLightboxIndex})">`
        : '';

    let galleryHtml = '';
    if (currentLightboxImages.length > 1) {
        galleryHtml = '<div class="recipe-gallery-thumbnails">';
        currentLightboxImages.forEach((imgUrl, idx) => {
            const isActive = imgUrl === initialMainImageUrl ? 'active' : '';
            galleryHtml += `<img src="${imgUrl}" alt="Thumbnail ${idx}" class="${isActive}" onclick="updateMainViewImage('${imgUrl}', ${idx}, this)">`;
        });
        galleryHtml += '</div>';
    }

    // Format ingredients as list
    let ingredientsHtml = '';
    if (recipe.ingredients && recipe.ingredients.trim() !== '') {
        const ingredientsItems = recipe.ingredients
            .split('\n')
            .filter(i => i.trim() !== '')
            .map(i => `<li>${i}</li>`)
            .join('');
        ingredientsHtml = `
            <div class="ingredients-list">
                <h4>${t('ingredients')}</h4>
                <ul>
                    ${ingredientsItems}
                </ul>
            </div>
        `;
    }

    let instructionsHtml = '';
    if (recipe.instructions && recipe.instructions.trim() !== '') {
        instructionsHtml = `
            <div class="instructions-section">
                <h4>${t('instructions')}</h4>
                <p>${recipe.instructions}</p>
            </div>
        `;
    }

    const viewCategories = (recipe.category || '').split(',').map(c => c.trim()).filter(Boolean);
    const viewTagsHtml = viewCategories.length > 0
        ? viewCategories.map(c => `<span class="recipe-tag"><i class="fa-solid fa-tag"></i> ${c}</span>`).join('')
        : '';

    viewRecipeDetails.innerHTML = `
        <div class="recipe-detail-header">
            ${mainImageHtml}
            ${galleryHtml}
            <h2 class="recipe-detail-title">${recipe.title}</h2>
            <div class="recipe-detail-meta">
                <div class="recipe-tags-container" style="margin:0;">${viewTagsHtml}</div>
                <span><i class="fa-regular fa-calendar"></i> ${new Date(recipe.createdAt).toLocaleDateString(currentLang === 'ua' ? 'uk-UA' : 'de-DE')}</span>
            </div>
        </div>
        <div class="recipe-detail-body">
            ${ingredientsHtml}
            ${instructionsHtml}
        </div>
    `;

    // Reset scroll position
    const viewModalContent = viewModal.querySelector('.view-modal-content');
    if (viewModalContent) {
        viewModalContent.scrollTop = 0;
    }

    viewModal.classList.remove('hidden');
}

// Function to handle clicking a thumbnail in the view modal
function updateMainViewImage(url, index, element) {
    const mainImg = document.getElementById('mainRecipeViewImage');
    if (mainImg) {
        mainImg.src = url;
        mainImg.onclick = () => openLightbox(index);
    }

    // Update active state on thumbnails
    const thumbnails = document.querySelectorAll('.recipe-gallery-thumbnails img');
    thumbnails.forEach(thumb => thumb.classList.remove('active'));
    element.classList.add('active');
}

// Lightbox Open/Close/Navigate Logic
function openLightbox(index) {
    if (currentLightboxImages.length === 0) return;
    currentLightboxIndex = index;
    updateLightboxView();
    lightboxModal.classList.remove('hidden');
}

function updateLightboxView() {
    lightboxImage.src = currentLightboxImages[currentLightboxIndex];
    lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;

    // Hide prev/next if only 1 image
    if (currentLightboxImages.length <= 1) {
        lightboxPrevBtn.style.display = 'none';
        lightboxNextBtn.style.display = 'none';
    } else {
        lightboxPrevBtn.style.display = 'block';
        lightboxNextBtn.style.display = 'block';
    }
}

function closeLightbox() {
    lightboxModal.classList.add('hidden');
    lightboxImage.src = '';
}

function nextLightboxImage() {
    currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
    updateLightboxView();
}

function prevLightboxImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
    updateLightboxView();
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
