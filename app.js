// app.js

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://tdexsgzinjbabiczihwj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xtguokRm66tP1SEwGC-RaQ_ifuZSJ9U';

// Initialize Supabase Client with strict cache busting
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
        fetch: (url, options) => {
            return fetch(url, { ...options, cache: 'no-store' });
        }
    }
});

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
const viewRecipeDetails = document.getElementById('viewRecipeDetails');
const editRecipeBtn = document.getElementById('editRecipeBtn');
const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

let currentViewRecipeId = null;
let editingRecipeId = null;
let quill; // Global Quill instance
let isFolderEditMode = false;
let isFolderWiggling = false; // Track wiggle state
let draggedFolderItem = null;
let autoScrollRAF = null;
let autoScrollVelocity = 0;
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
// Custom Language Selectors
const loginLanguageHeader = document.getElementById('loginLanguageHeader');
const loginLanguageDropdown = document.getElementById('loginLanguageDropdown');
const loginLanguageContainer = document.getElementById('loginLanguageContainer');

const settingsLanguageHeader = document.getElementById('settingsLanguageHeader');
const settingsLanguageDropdown = document.getElementById('settingsLanguageDropdown');
const settingsLanguageContainer = document.getElementById('settingsLanguageContainer');

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

function updateLayoutVariables() {
    const header = document.querySelector('.app-header');
    if (header) {
        document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }
}

// Global Modal Transition Helpers
function showModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
}

function hideModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
}

window.addEventListener('resize', updateLayoutVariables);
document.addEventListener('DOMContentLoaded', updateLayoutVariables);
// Call once immediately in case DOMContentLoaded already fired or for initial parsing
updateLayoutVariables();

function positionDropdown(dropdown) {
    const header = document.querySelector('.app-header');
    if (header) {
        dropdown.style.top = header.offsetHeight + 'px';
        // Ensure dropdowns never exceed the visible screen area (100dvh total) minus the header height.
        // This mathematically guarantees the bottom scrolling edge stays on-screen and fully reachable.
        dropdown.style.maxHeight = `calc(100dvh - ${header.offsetHeight}px)`;
    }
}

if (mobileFoldersBtn && mobileControlsBtn) {
    mobileFoldersBtn.addEventListener('click', () => {
        mobileDropdownFolders.classList.toggle('hidden');
        mobileDropdownControls.classList.add('hidden');
        if (window.innerWidth <= 768 && settingsModal) settingsModal.classList.add('hidden');

        const foldersOpen = !mobileDropdownFolders.classList.contains('hidden');
        if (foldersOpen) positionDropdown(mobileDropdownFolders);
        document.querySelectorAll('.multi-select-dropdown').forEach(d => d.classList.add('hidden'));
    });

    mobileControlsBtn.addEventListener('click', () => {
        mobileDropdownControls.classList.toggle('hidden');
        mobileDropdownFolders.classList.add('hidden');
        if (window.innerWidth <= 768 && settingsModal) settingsModal.classList.add('hidden');

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
        const settingsOpen = settingsModal && !settingsModal.classList.contains('hidden');
        const isMobile = window.innerWidth <= 768;

        if (foldersOpen || controlsOpen || (settingsOpen && isMobile)) {
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

        // Add settings button icon sync
        if (settingsBtn) {
            const icon = settingsBtn.querySelector('i');
            if (settingsOpen && isMobile) {
                if (icon) icon.className = 'fa-solid fa-xmark';
                settingsBtn.classList.add('active-dropdown-btn');
            } else {
                if (icon) icon.className = 'fa-solid fa-gear';
                settingsBtn.classList.remove('active-dropdown-btn');
            }
        }

        const openModals = Array.from(document.querySelectorAll('.modal:not(.hidden)'));
        const shouldBeModalActive = openModals.some(modal => {
            if (isMobile && modal.id === 'settingsModal') return false;
            return true;
        });

        if (shouldBeModalActive) {
            document.body.classList.add('modal-active');
            
            // On iOS Safari, clientWidth takes a frame to update after overflow:hidden
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    let scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
                    // Only apply on desktop. Mobile browsers use floating scrollbars that don't affect layout width.
                    if (scrollbarWidth > 0 && window.innerWidth > 768) {
                        document.body.style.paddingRight = `${scrollbarWidth}px`;
                        const header = document.querySelector('.app-header');
                        if (header) header.style.paddingRight = `${scrollbarWidth + 16}px`;
                    }
                });
            });
        } else {
            document.body.style.paddingRight = '';
            const header = document.querySelector('.app-header');
            if (header) header.style.paddingRight = '';
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
    const isMobile = window.innerWidth <= 768;
    const foldersOpen = mobileDropdownFolders && !mobileDropdownFolders.classList.contains('hidden');
    const controlsOpen = mobileDropdownControls && !mobileDropdownControls.classList.contains('hidden');
    const settingsOpen = settingsModal && !settingsModal.classList.contains('hidden') && isMobile;

    if (!foldersOpen && !controlsOpen && !settingsOpen) return;

    // Do not close dropdowns if interacting with a modal (unless it's the settings modal on mobile)
    if (document.body.classList.contains('modal-active') && !settingsOpen) return;

    // Check if click is inside the header or dropdowns
    const header = document.querySelector('.app-header');
    if (header && header.contains(e.target)) return;
    if (mobileDropdownFolders && mobileDropdownFolders.contains(e.target)) return;
    if (mobileDropdownControls && mobileDropdownControls.contains(e.target)) return;
    if (settingsOpen && settingsModal.querySelector('.modal-content') && settingsModal.querySelector('.modal-content').contains(e.target)) return;

    // Close dropdowns
    if (foldersOpen) mobileDropdownFolders.classList.add('hidden');
    if (controlsOpen) mobileDropdownControls.classList.add('hidden');
    if (settingsOpen) settingsModal.classList.add('hidden');

    e.stopPropagation();
    e.preventDefault();
}, true);

// Initialize app
async function initApp() {
    adaptMobileLayout();

    // Initialize Custom Language Selectors
    const onLanguageChange = (lang) => {
        currentLang = lang;
        localStorage.setItem('appLang', currentLang);
        applyLanguage();
        // Sync custom headers manually
        syncLanguageHeaders();
        // Re-render components
        applyAppName(currentUser?.user_metadata?.app_name);
        renderFolders();
        renderRecipes();
    };

    setupSingleSelectDropdown(loginLanguageHeader, loginLanguageDropdown, loginLanguageContainer, currentLang, onLanguageChange);
    setupSingleSelectDropdown(settingsLanguageHeader, settingsLanguageDropdown, settingsLanguageContainer, currentLang, onLanguageChange);

    syncLanguageHeaders();

    setupEventListeners();
    setupFolderItemListenersOnce(); // New function for one-time listeners
    applyViewState();
    await checkUser();
}

function syncLanguageHeaders() {
    const selectors = [
        { header: loginLanguageHeader, dropdown: loginLanguageDropdown },
        { header: settingsLanguageHeader, dropdown: settingsLanguageDropdown }
    ];

    selectors.forEach(({ header, dropdown }) => {
        if (!header || !dropdown) return;
        const option = dropdown.querySelector(`.multi-select-option[data-value="${currentLang}"]`);
        if (option) {
            dropdown.querySelectorAll('.multi-select-option').forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            header.innerHTML = `${option.innerHTML} <i class="fa-solid fa-chevron-down"></i>`;
        }
    });
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

            // Execute synchronously sequentially to prevent Supabase connection/token race conditions
            (async () => {
                await loadFolders();
                await loadCategories();
                await loadRecipes();
            })();
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

    // DIAGNOSTIC: Check if column exists in results
    if (recipes.length > 0) {
        if (!('checked_ingredients' in recipes[0])) {
            console.error("DIAGNOSTIC: The 'checked_ingredients' column is NOT present in the recipes data from Supabase. Please ensure you ran the SQL script.");
        } else {
            console.log("DIAGNOSTIC: 'checked_ingredients' column found in database results.");
        }
    }

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

            // Force iOS Safari repaint by rendering while visible
            if (!categoryFilterDropdown.classList.contains('hidden')) {
                renderCategories();
            }
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
    // Ensure folders are always sorted by order_index, then by creation date
    if (folders) {
        folders.sort((a, b) => {
            const orderA = a.order_index !== undefined && a.order_index !== null ? a.order_index : 9999;
            const orderB = b.order_index !== undefined && b.order_index !== null ? b.order_index : 9999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.createdAt || 0) - (b.createdAt || 0);
        });
    }

    const editFoldersBtn = document.getElementById('editFoldersBtn');
    if (editFoldersBtn) {
        if (isFolderEditMode) {
            editFoldersBtn.classList.add('active');
            folderList.classList.add('folder-edit-mode');
        } else {
            editFoldersBtn.classList.remove('active');
            folderList.classList.remove('folder-edit-mode');
            // Stop wiggling when leaving edit mode
            isFolderWiggling = false;
        }
    }

    // Update the "All Recipes" header button state
    const allRecipesBtn = document.getElementById('allRecipesBtn');
    if (allRecipesBtn) {
        allRecipesBtn.classList.add('active'); // Immer lila
    }

    // Reset folder list
    folderList.innerHTML = '';

    // Reset Dropdown
    recipeFolderSelect.innerHTML = `<option value="">${t('no_folder')}</option>`;

    if (folders) {
        folders.forEach(folder => {
            // Add to Sidebar
            const li = document.createElement('li');
            li.className = `folder-item sortable-folder ${currentFolderId === folder.id ? 'active' : ''}`;
            li.dataset.folderId = folder.id;
            if (isFolderEditMode) {
                // Only enable native draggable on non-mobile to prevent interference with touch reordering
                if (window.innerWidth > 768) {
                    li.setAttribute('draggable', 'true');
                } else {
                    li.removeAttribute('draggable');
                }
                // Apply wiggle if we are in wiggle mode
                if (isFolderWiggling) li.classList.add('wiggling');
            }

            li.innerHTML = `
                <div class="folder-name-container">
                    <i class="fa-regular fa-folder"></i>
                    <span title="${folder.name}">${folder.name}</span>
                </div>
                <div class="folder-actions">
                    <button class="rename-folder-btn" title="Ordner umbenennen" data-id="${folder.id}" data-name="${folder.name}">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
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

async function saveFolderOrder() {
    if (!currentUser) return;

    // Get current order from DOM
    const sortedIds = Array.from(folderList.querySelectorAll('.folder-item'))
        .map(item => item.dataset.folderId);

    // Update locally
    folders.sort((a, b) => {
        return sortedIds.indexOf(String(a.id)) - sortedIds.indexOf(String(b.id));
    });

    // Sync with Supabase
    try {
        const updates = sortedIds.map((id, index) => {
            // Update local state property
            const folder = folders.find(f => String(f.id) === String(id));
            if (folder) folder.order_index = index;

            return {
                id: id,
                order_index: index,
                user_id: currentUser.id
            };
        });

        const { error } = await sbClient
            .from('folders')
            .upsert(updates);

        if (error) throw error;
        console.log("Folder order saved successfully");
    } catch (err) {
        console.error("Error saving folder order:", err);
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

function startAutoScroll() {
    if (autoScrollRAF) return;
    const scroll = () => {
        if (autoScrollVelocity !== 0 && folderList) {
            folderList.scrollTop += autoScrollVelocity;
        }
        autoScrollRAF = requestAnimationFrame(scroll);
    };
    autoScrollRAF = requestAnimationFrame(scroll);
}

function stopAutoScroll() {
    if (autoScrollRAF) {
        cancelAnimationFrame(autoScrollRAF);
        autoScrollRAF = null;
    }
    autoScrollVelocity = 0;
}

function setupFolderItemListenersOnce() {
    // 1. "All Recipes" Title Button Click
    const allRecipesBtn = document.getElementById('allRecipesBtn');
    if (allRecipesBtn) {
        allRecipesBtn.addEventListener('click', () => {
            if (isFolderEditMode) return;
            currentFolderId = 'all';
            renderFolders();
            renderRecipes();

            // Auto-close mobile dropdown if open
            if (mobileDropdownFolders) {
                mobileDropdownFolders.classList.add('hidden');
                if (mobileFoldersBtn) {
                    const icon = mobileFoldersBtn.querySelector('i');
                    if (icon) icon.className = 'fa-regular fa-folder-open';
                    mobileFoldersBtn.classList.remove('active-dropdown-btn');
                }
            }
        });
    }

    const editFoldersBtn = document.getElementById('editFoldersBtn');
    if (editFoldersBtn) {
        editFoldersBtn.addEventListener('click', async (e) => {
            e.stopPropagation();

            if (isFolderEditMode) {
                // We are exiting edit mode: save current order state to DB
                await saveFolderOrder();
                isFolderEditMode = false;
                isFolderWiggling = false;
            } else {
                // We are entering edit mode: just toggle state
                isFolderEditMode = true;
                isFolderWiggling = true;
            }

            renderFolders();
        });
    }
}

function setupFolderItemListeners() {


    // Folder Clicks (includes "All Recipes" and Sidebar items)
    const items = document.querySelectorAll('.sidebar .folder-item');
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

    // Rename Folder clicks
    const renameBtns = folderList.querySelectorAll('.rename-folder-btn');
    renameBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const currentName = btn.dataset.name;
            const newName = prompt(t('prompt_rename_folder'), currentName);

            if (newName && newName.trim() !== '' && newName !== currentName) {
                const trimmedName = newName.trim();
                const { error } = await sbClient.from('folders').update({ name: trimmedName }).eq('id', id);

                if (!error) {
                    await loadFolders();
                    if (currentFolderId === id) {
                        const activeFolderName = document.getElementById('activeFolderName');
                        if (activeFolderName) activeFolderName.textContent = trimmedName;
                    }
                } else {
                    alert(t('err_rename_folder') + error.message);
                }
            }
        });
    });

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
            stopAutoScroll();
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
            if (!isFolderEditMode) return;
            if (!item.classList.contains('sortable-folder')) return;

            if (draggedFolderItem && item !== draggedFolderItem) {
                e.dataTransfer.dropEffect = 'move';

                // Live reordering: swap items in DOM immediately
                const bounding = item.getBoundingClientRect();
                const midpoint = bounding.y + (bounding.height / 2);

                if (e.clientY > midpoint) {
                    item.after(draggedFolderItem);
                } else {
                    item.before(draggedFolderItem);
                }
            }

            // Desktop Auto-scroll Logic (Always run during drag even if over self)
            if (draggedFolderItem || draggedRecipeCard) {
                const scrollContainer = folderList;
                if (scrollContainer) {
                    const rect = scrollContainer.getBoundingClientRect();
                    const edgeThreshold = 60;
                    const distFromTop = e.clientY - rect.top;
                    const distFromBottom = rect.bottom - e.clientY;

                    if (distFromTop < edgeThreshold) {
                        autoScrollVelocity = -Math.max(5, (1 - distFromTop / edgeThreshold) * 20);
                        if (!autoScrollRAF) startAutoScroll();
                    } else if (distFromBottom < edgeThreshold) {
                        autoScrollVelocity = Math.max(5, (1 - distFromBottom / edgeThreshold) * 20);
                        if (!autoScrollRAF) startAutoScroll();
                    } else {
                        stopAutoScroll();
                    }
                }
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
            item.classList.remove('recipe-drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            item.classList.remove('recipe-drag-over');
            stopAutoScroll();

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

            // Handling Folder Sort logic: Already handled live in dragover,
            // just save the final order now.
            if (!isFolderEditMode || !draggedFolderItem) return;

            // Save new order using centralized function
            await saveFolderOrder();
        });

        // --- Touch-based drag and drop for mobile (iOS Style Wiggle) ---
        let touchLongPressTimer = null;
        let touchDragging = false;
        let touchInitialY = 0;

        item.addEventListener('touchstart', (e) => {
            if (!isFolderEditMode) return;
            if (e.target.closest('.folder-actions')) return;

            const touch = e.touches[0];
            touchInitialY = touch.pageY;

            // We are already wiggling, but we need a very short delay to distinguish 
            // We are already wiggling, but we need a very short delay to distinguish
            // from an intentional scroll toggle (though preventDefault on move handles this).
            // 100ms is enough to signal "I want to grab this item".
            touchLongPressTimer = setTimeout(() => {
                touchDragging = true;
                draggedFolderItem = item;
                item.classList.add('dragging-touch');

                if (navigator.vibrate) navigator.vibrate(50);
            }, 100);
        }, { passive: true });

        item.addEventListener('touchmove', (e) => {
            if (!isFolderEditMode) {
                clearTimeout(touchLongPressTimer);
                return;
            }

            const touch = e.touches[0];

            // If we move too much before the long press trigger, cancel it (Increased tolerance)
            if (!isFolderWiggling && Math.abs(touch.pageY - touchInitialY) > 25) {
                clearTimeout(touchLongPressTimer);
                return;
            }

            if (!touchDragging || draggedFolderItem !== item) return;

            e.preventDefault(); // Prevent page scroll when dragging

            const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            if (!targetEl) return;
            const targetItem = targetEl.closest('.sortable-folder');

            if (targetItem && targetItem !== item) {
                const bounding = targetItem.getBoundingClientRect();
                const midpoint = bounding.y + (bounding.height / 2);

                if (touch.clientY > midpoint) {
                    targetItem.after(item);
                } else {
                    targetItem.before(item);
                }
            }

            // Auto-scroll logic (Refined for continuous movement)
            const scrollContainer = folderList;
            const containerRect = scrollContainer.getBoundingClientRect();
            const edgeThreshold = 80; // Larger threshold for easier trigger

            const distFromTop = touch.clientY - containerRect.top;
            const distFromBottom = containerRect.bottom - touch.clientY;

            if (distFromTop < edgeThreshold) {
                // Near top edge
                autoScrollVelocity = -Math.max(2, (1 - distFromTop / edgeThreshold) * 15);
                if (!autoScrollRAF) startAutoScroll();
            } else if (distFromBottom < edgeThreshold) {
                // Near bottom edge
                autoScrollVelocity = Math.max(2, (1 - distFromBottom / edgeThreshold) * 15);
                if (!autoScrollRAF) startAutoScroll();
            } else {
                // Not near edge
                stopAutoScroll();
            }
        }, { passive: false });

        item.addEventListener('contextmenu', (e) => {
            if (isFolderEditMode) e.preventDefault();
        });

        item.addEventListener('touchend', async () => {
            clearTimeout(touchLongPressTimer);
            stopAutoScroll();
            if (!touchDragging || draggedFolderItem !== item) return;

            touchDragging = false;

            // Restore item state
            item.classList.remove('dragging-touch');
            draggedFolderItem = null;

            // Save new order using centralized function
            await saveFolderOrder();
        }, { passive: true });

        item.addEventListener('touchcancel', () => {
            clearTimeout(touchLongPressTimer);
            stopAutoScroll();
            touchDragging = false;

            // Restore item state
            item.classList.remove('dragging-touch');
            draggedFolderItem = null;
        }, { passive: true });
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
                ? `<img src="${recipe.imageData}" alt="${recipe.title}" loading="lazy">`
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
                    <div class="card-header">
                        <h3>${recipe.title}</h3>
                        ${tagsHtml}
                    </div>
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
        if (document.body.classList.contains('modal-active')) return; // Let modal handle its own state

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
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Mobile: Toggle behavior like other dropdowns
            if (!settingsModal.classList.contains('hidden')) {
                settingsModal.classList.add('hidden');
                return;
            }

            // Close other dropdowns first
            if (mobileDropdownFolders) mobileDropdownFolders.classList.add('hidden');
            if (mobileDropdownControls) mobileDropdownControls.classList.add('hidden');
        }

        showModal(settingsModal);
        passwordMessage.classList.add('hidden');
        appNameMessage.classList.add('hidden');
        appNameInput.value = currentUser?.user_metadata?.app_name || '';

        // Position it under the header exactly like mobile folders
        if (isMobile) {
            positionDropdown(settingsModal.querySelector('.modal-content'));
        }

        // Force iOS Safari repaint by rendering while visible
        renderCategories();
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
        hideModal(settingsModal);
    });

    // Support instant pointer interaction for Safari/mobile
    closeSettingsModalBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        hideModal(settingsModal);
    });

    // Click outside to close
    settingsModal.addEventListener('pointerdown', (e) => {
        if (e.target === settingsModal) hideModal(settingsModal);
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

    // Settings - Bulk Optimize Images
    const optimizeImagesBtn = document.getElementById('optimizeImagesBtn');
    const optimizeImagesProgress = document.getElementById('optimizeImagesProgress');

    if (optimizeImagesBtn) {
        optimizeImagesBtn.addEventListener('click', async () => {
            if (!confirm(t('optimize_images_confirm') || 'Dies komprimiert alle alten Bilder dauerhaft, um Speicherplatz zu sparen. Fortfahren?')) return;

            optimizeImagesBtn.disabled = true;
            optimizeImagesProgress.classList.remove('hidden');
            optimizeImagesProgress.style.color = 'var(--color-primary)';

            try {
                // Fetch all user recipes to check their images
                const { data: allRecipes, error: fetchErr } = await sbClient
                    .from('recipes')
                    .select('*')
                    .eq('user_id', currentUser.id);

                if (fetchErr) throw fetchErr;

                let optimizedCount = 0;
                let errorCount = 0;
                let totalImagesToCheck = 0;

                // First count how many images exist to give progress info
                for (const recipe of allRecipes) {
                    if (recipe.images && recipe.images.length > 0) totalImagesToCheck += recipe.images.length;
                    else if (recipe.imageData) totalImagesToCheck += 1;
                }

                if (totalImagesToCheck === 0) {
                    optimizeImagesProgress.textContent = "Keine Bilder zum Optimieren gefunden.";
                    optimizeImagesBtn.disabled = false;
                    return;
                }

                let processedImages = 0;

                for (const recipe of allRecipes) {
                    let hasChanges = false;
                    let newImages = [];
                    let newImageData = null;

                    const imagesToProcess = recipe.images && recipe.images.length > 0
                        ? recipe.images
                        : (recipe.imageData ? [recipe.imageData] : []);

                    for (const imgUrl of imagesToProcess) {
                        processedImages++;
                        optimizeImagesProgress.textContent = `Vorgang läuft... (${processedImages}/${totalImagesToCheck}) Bitte warten...`;

                        try {
                            // 1. Fetch raw image bytes from storage
                            const res = await fetch(imgUrl);
                            if (!res.ok) throw new Error("Fetch failed");
                            const blob = await res.blob();

                            // Fast skip for images that are already tiny (e.g., < 300KB)
                            if (blob.size < 300 * 1024) {
                                newImages.push(imgUrl);
                                if (imgUrl === recipe.imageData) newImageData = imgUrl;    
                                continue;
                            }

                            // 2. Compress via Canvas
                            const file = new File([blob], `optimize_${Date.now()}.jpg`, { type: blob.type });
                            
                            // Using the previously accessible compressImage logic
                            // Fallback canvas pipeline inline since compressImage might be scoped differently
                            const compressedBlob = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = event => {
                                    const img = new Image();
                                    img.src = event.target.result;
                                    img.onload = () => {
                                        let width = img.width;
                                        let height = img.height;
                                        const maxWidth = 1600;
                                        const maxHeight = 1600;

                                        if (width > height) {
                                            if (width > maxWidth) {
                                                height = Math.round((height *= maxWidth / width));
                                                width = maxWidth;
                                            }
                                        } else {
                                            if (height > maxHeight) {
                                                width = Math.round((width *= maxHeight / height));
                                                height = maxHeight;
                                            }
                                        }

                                        const canvas = document.createElement('canvas');
                                        canvas.width = width;
                                        canvas.height = height;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(img, 0, 0, width, height);

                                        canvas.toBlob((cblob) => {
                                            if (cblob) resolve(cblob);
                                            else reject("Canvas to Blob failed");
                                        }, 'image/jpeg', 0.8);
                                    };
                                    img.onerror = error => reject(error);
                                };
                                reader.onerror = error => reject(error);
                            });

                            const compressedFile = new File([compressedBlob], `opt_${Date.now()}.jpg`, { type: 'image/jpeg' });

                            // 3. Upload new optimized file
                            const fileName = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.jpg`;
                            const { error: uploadErr } = await sbClient.storage
                                .from('recipe-images')
                                .upload(fileName, compressedFile);

                            if (uploadErr) throw uploadErr;

                            const { data: publicUrlData } = sbClient.storage
                                .from('recipe-images')
                                .getPublicUrl(fileName);

                            const newUrl = publicUrlData.publicUrl;
                            newImages.push(newUrl);

                            if (imgUrl === recipe.imageData || (imagesToProcess.length === 1 && !recipe.imageData)) {
                                newImageData = newUrl;
                            }

                            hasChanges = true;
                            optimizedCount++;

                            // 4. Delete the old giant file from Supabase storage
                            const oldUrlParts = imgUrl.split('/');
                            const oldFileName = oldUrlParts[oldUrlParts.length - 1];
                            // Best effort delete
                            await sbClient.storage.from('recipe-images').remove([oldFileName]).catch(() => {});

                        } catch (err) {
                            console.error("Failed to optimize image:", imgUrl, err);
                            errorCount++;
                            // Fallback to original URL
                            newImages.push(imgUrl);
                            if (imgUrl === recipe.imageData) newImageData = imgUrl; 
                        }
                    }

                    // 5. Update DB if changes were made
                    if (hasChanges) {
                        const updatePayload = { images: newImages };
                        if (newImageData) updatePayload.imageData = newImageData;

                        const { error: updateErr } = await sbClient
                            .from('recipes')
                            .update(updatePayload)
                            .eq('id', recipe.id);
                        
                        if (updateErr) console.error("Failed to update recipe DB entry", updateErr);
                    }
                }

                optimizeImagesProgress.textContent = `Fertig! ${optimizedCount} Bild(er) komprimiert. ${errorCount > 0 ? `(${errorCount} Fehler)` : ''}`;
                // Reload ui
                await loadRecipes();

            } catch (error) {
                console.error(error);
                optimizeImagesProgress.style.color = 'var(--color-accent)';
                optimizeImagesProgress.textContent = "Ein unerwarteter Fehler ist aufgetreten: " + error.message;
            } finally {
                optimizeImagesBtn.disabled = false;
            }
        });
    }

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
        showModal(folderModal);
        setTimeout(() => folderNameInput.focus(), 100);
    });

    const closeFolderModal = () => hideModal(folderModal);
    closeFolderModalBtn.addEventListener('click', closeFolderModal);
    cancelFolderModalBtn.addEventListener('click', closeFolderModal);

    // Support instant pointer interaction for Safari/mobile
    closeFolderModalBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); closeFolderModal(); });
    cancelFolderModalBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); closeFolderModal(); });

    // Click outside to close (disabled per user request to lock background completely)
    // folderModal.addEventListener('pointerdown', (e) => {
    //     if (e.target === folderModal) closeFolderModal();
    // });

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
        if (quill) quill.setContents([]); // Clear Rich Text Editor
        // Uncheck all category checkboxes
        document.querySelectorAll('#recipeCategoryCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('modalTitle').textContent = t('add_recipe_title');
        recipeFolderSelect.value = currentFolderId === 'all' ? '' : currentFolderId;
        currentRecipeImages = [];
        
        // Reset scroll position
        const recipeModalContent = recipeModal.querySelector('.modal-content');
        if (recipeModalContent) {
            recipeModalContent.scrollTop = 0;
        }

        showModal(recipeModal);
    });

    const closeAddModal = () => {
        hideModal(recipeModal);
        recipeForm.reset();
        // Clear Quill
        if (quill) quill.setContents([{ insert: '\n' }]);
        currentRecipeImages = [];
        renderImagePreviewGrid();
        // Reset fullscreen state if active
        const container = document.querySelector('.textarea-container.fullscreen');
        if (container) {
            container.classList.remove('fullscreen');
            const icon = container.querySelector('.fullscreen-toggle-btn i');
            if (icon) icon.className = 'fa-solid fa-expand';
        }
    };
    closeModalBtn.addEventListener('click', closeAddModal);
    cancelBtn.addEventListener('click', closeAddModal);

    // Support instant pointer interaction for Safari/mobile
    closeModalBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); closeAddModal(); });
    cancelBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); closeAddModal(); });

    // Click outside to close (disabled per user request)
    // recipeModal.addEventListener('pointerdown', (e) => {
    //     if (e.target === recipeModal) closeAddModal();
    // });

    // Fullscreen Toggle for Ingredients
    const ingredientsFullscreenBtn = document.getElementById('ingredientsFullscreenBtn');
    if (ingredientsFullscreenBtn) {
        ingredientsFullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const container = ingredientsFullscreenBtn.closest('.textarea-container');
            const icon = ingredientsFullscreenBtn.querySelector('i');
            if (container) {
                container.classList.toggle('fullscreen');
                if (container.classList.contains('fullscreen')) {
                    icon.className = 'fa-solid fa-compress';
                } else {
                    icon.className = 'fa-solid fa-expand';
                }
            }
        });
    }

    // Fullscreen Toggle for Instructions (Quill)
    const instructionsFullscreenBtn = document.getElementById('instructionsFullscreenBtn');
    if (instructionsFullscreenBtn) {
        instructionsFullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const container = instructionsFullscreenBtn.closest('.textarea-container');
            const icon = instructionsFullscreenBtn.querySelector('i');
            if (container) {
                container.classList.toggle('fullscreen');
                if (container.classList.contains('fullscreen')) {
                    icon.className = 'fa-solid fa-compress';
                } else {
                    icon.className = 'fa-solid fa-expand';
                }
            }
        });
    }

    // View Modal
    const closeViewModal = () => {
        hideModal(viewModal);
        currentViewRecipeId = null;
        closeLightbox();
        stopAutoScroll();
    };
    viewModal.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('#closeViewModalBtn');
        if (closeBtn) closeViewModal();
    });

    // Click outside to close (disabled per user request)
    // viewModal.addEventListener('pointerdown', (e) => {
    //     if (e.target === viewModal) closeViewModal();
    // });

    // Edit Recipe (Delegated)
    viewModal.addEventListener('click', (e) => {
        const btn = e.target.closest('#editRecipeBtn');
        if (!btn || !currentViewRecipeId) return;

        const recipe = recipes.find(r => r.id === currentViewRecipeId);
        if (!recipe) return;

        hideModal(viewModal);
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
        
        if (quill) {
            // Load HTML content into Quill editor safely
            quill.clipboard.dangerouslyPasteHTML(recipe.instructions || '');
        } else {
            // Fallback
            document.getElementById('recipeInstructions').value = recipe.instructions;
        }

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

        // Reset scroll position
        const recipeModalContent = recipeModal.querySelector('.modal-content');
        if (recipeModalContent) {
            recipeModalContent.scrollTop = 0;
        }

        showModal(recipeModal);
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
            img.loading = 'lazy';
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

    // Helper function to compress images
    const compressImage = (file, maxWidth, maxHeight, quality) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height *= maxWidth / width));
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width *= maxHeight / height));
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            // Create a new File object from the Blob
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(compressedFile);
                        } else {
                            reject(new Error('Canvas to Blob failed'));
                        }
                    }, 'image/jpeg', quality);
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    };

    recipeImageInput.addEventListener('change', async function (e) {
        const files = Array.from(e.target.files);
        
        // Disable the form temporarily to prevent saving while compressing
        const saveBtn = recipeForm.querySelector('button[type="submit"]');
        const origText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Komprimiere Bilder...';

        try {
            for (const file of files) {
                // Compress image if it's an image file (e.g., JPEG, PNG, HEIC converted to JPEG)
                let processedFile = file;
                if (file.type.startsWith('image/')) {
                    try {
                        // Max 1600x1600 resolution, 0.8 quality jpeg
                        processedFile = await compressImage(file, 1600, 1600, 0.8);
                    } catch (err) {
                        console.error('Image compression failed for', file.name, err);
                        // Fallback to original file if compression fails
                    }
                }

                currentRecipeImages.push({
                    file: processedFile,
                    url: null,
                    isDefault: currentRecipeImages.length === 0
                });
            }
        } finally {
            // Restore button
            saveBtn.disabled = false;
            saveBtn.textContent = origText;
            
            recipeImageInput.value = '';
            renderImagePreviewGrid();
        }
    });

    // Form Submit (Save Recipe)
    recipeForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('recipeTitle').value;
        const checkedBoxes = document.querySelectorAll('#recipeCategoryCheckboxes input:checked');
        const category = Array.from(checkedBoxes).map(cb => cb.value).join(',');
        const folder_id = document.getElementById('recipeFolder').value || null;
        const ingredients = document.getElementById('recipeIngredients').value;
        // Extract HTML from Quill editor instead of textarea
        const instructions = quill ? quill.root.innerHTML : document.getElementById('recipeInstructions').value;

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

    // Delete Recipe (Delegated)
    viewModal.addEventListener('click', async (e) => {
        const btn = e.target.closest('#deleteRecipeBtn');
        if (!btn || !currentViewRecipeId) return;

        if (confirm('Möchtest du dieses Rezept wirklich löschen?')) {
            btn.disabled = true;
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Löschen...';

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
                hideModal(viewModal);
                currentViewRecipeId = null;
            } catch (error) {
                alert(t('err_delete_recipe') || 'Fehler beim Löschen des Rezepts.');
                console.error(error);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalContent;
            }
        }
    });

    // Close modals on outside click (desktop only)
    // On mobile, modals are fullscreen so there's no backdrop to click.
    // iOS Safari also fires phantom clicks during scroll gestures which would close modals.
    window.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) return;
        if (e.target === recipeModal) hideModal(recipeModal);
        if (e.target === viewModal) closeViewModal();
        if (e.target === folderModal) closeFolderModal();
        if (e.target === settingsModal) {
            hideModal(settingsModal);
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

    // Persistence: Load checked state from DB (can be array or JSON string)
    let savedCheckedIndices = [];
    if (recipe.checked_ingredients) {
        if (Array.isArray(recipe.checked_ingredients)) {
            savedCheckedIndices = recipe.checked_ingredients;
        } else if (typeof recipe.checked_ingredients === 'string' && recipe.checked_ingredients.trim() !== '') {
            try {
                savedCheckedIndices = JSON.parse(recipe.checked_ingredients);
            } catch (e) {
                console.warn("Could not parse checked_ingredients string", e);
            }
        }
    }

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

    const closeButtonHtml = `<div style="display:flex;justify-content:flex-end;margin-bottom:0.5rem;"><button class="close-btn" id="closeViewModalBtn"><i class="fa-solid fa-times"></i></button></div>`;

    const mainImageHtml = initialMainImageUrl
        ? `<div class="recipe-detail-image-wrapper">
            <img src="${initialMainImageUrl}" alt="${recipe.title}" loading="lazy" class="recipe-detail-image" id="mainRecipeViewImage" onclick="openLightbox(${currentLightboxIndex})">
           </div>`
        : '';

    let galleryHtml = '';
    if (currentLightboxImages.length > 1) {
        galleryHtml = '<div class="recipe-gallery-thumbnails">';
        currentLightboxImages.forEach((imgUrl, idx) => {
            const isActive = imgUrl === initialMainImageUrl ? 'active' : '';
            galleryHtml += `<img src="${imgUrl}" alt="Thumbnail ${idx}" loading="lazy" class="${isActive}" onclick="updateMainViewImage('${imgUrl}', ${idx}, this)">`;
        });
        galleryHtml += '</div>';
    }

    // Format ingredients as list
    let ingredientsHtml = '';
    if (recipe.ingredients && recipe.ingredients.trim() !== '') {
        const ingredientsItems = recipe.ingredients
            .split('\n')
            .filter(i => i.trim() !== '')
            .map((i, index) => {
                const isChecked = savedCheckedIndices.includes(index);
                const checkedAttr = isChecked ? 'checked' : '';
                const checkedClass = isChecked ? 'is-checked' : '';
                return `
                <li class="ingredient-item">
                    <label class="ingredient-checkbox-label ${checkedClass}">
                        <input type="checkbox" class="ingredient-checkbox" data-index="${index}" ${checkedAttr}>
                        <span class="ingredient-text">${i.trim()}</span>
                    </label>
                </li>
            `;
            })
            .join('');
        ingredientsHtml = `
            <div class="ingredients-list">
                <h4>${t('ingredients')}</h4>
                <ul class="no-bullets">
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
                <div class="ql-snow">
                    <div class="ql-editor" style="padding: 0;">
                        ${recipe.instructions}
                    </div>
                </div>
            </div>
        `;
    }

    const viewCategories = (recipe.category || '').split(',').map(c => c.trim()).filter(Boolean);
    const viewTagsHtml = viewCategories.length > 0
        ? viewCategories.map(c => `<span class="recipe-tag"><i class="fa-solid fa-tag"></i> ${c}</span>`).join('')
        : '';

    viewRecipeDetails.innerHTML = `
        <div class="recipe-detail-header">
            ${closeButtonHtml}
            ${mainImageHtml}
            ${galleryHtml}
            <h2 class="recipe-detail-title">${recipe.title}</h2>
            <div class="recipe-detail-meta">
                <span><i class="fa-regular fa-calendar"></i> ${new Date(recipe.createdAt).toLocaleDateString(currentLang === 'ua' ? 'uk-UA' : 'de-DE')}</span>
                <div class="recipe-tags-container" style="margin:0;">${viewTagsHtml}</div>
            </div>
            <div class="recipe-view-actions">
                <button class="primary-btn" id="editRecipeBtn"><i class="fa-solid fa-pen"></i> <span data-i18n="edit_recipe">${t('edit_recipe')}</span></button>
                <button class="danger-btn" id="deleteRecipeBtn"><i class="fa-solid fa-trash"></i> <span data-i18n="delete_recipe">${t('delete_recipe')}</span></button>
            </div>
        </div>
        <div class="recipe-detail-body">
            ${ingredientsHtml}
            ${instructionsHtml}
        </div>
    `;

    // Persistence: Add listeners to save state to DB
    let saveTimeout = null;
    const checkboxes = viewRecipeDetails.querySelectorAll('.ingredient-checkbox');
    checkboxes.forEach(cb => {
        const handleChange = () => {
            const label = cb.closest('.ingredient-checkbox-label');
            if (label) {
                if (cb.checked) label.classList.add('is-checked');
                else label.classList.remove('is-checked');
            }

            const currentChecked = Array.from(checkboxes)
                .filter(box => box.checked)
                .map(box => parseInt(box.dataset.index));

            // 1. Update local memory immediately (both the passed object and the global array item)
            recipe.checked_ingredients = currentChecked;
            const globalRecipe = recipes.find(r => r.id === recipe.id);
            if (globalRecipe) globalRecipe.checked_ingredients = currentChecked;

            // 2. Debounced save to DB
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                try {
                    console.log(`Attempting to sync ingredients for recipe ${recipe.id}:`, currentChecked);
                    const { error } = await sbClient
                        .from('recipes')
                        .update({ checked_ingredients: currentChecked })
                        .eq('id', recipe.id);

                    if (error) {
                        console.error("Supabase Update Error:", error);
                        // Show a helpful alert for the user if it's a schema issue
                        if (error.code === 'PGRST204' || error.message.includes('column')) {
                            console.error("DIAGNOSTIC: The column 'checked_ingredients' seems to be missing in your Supabase 'recipes' table.");
                        }
                        throw error;
                    }
                    console.log("Ingredient status synced to DB successfully");
                } catch (err) {
                    console.error("Detailed Sync Error:", err);
                }
            }, 500);
        };

        cb.addEventListener('change', handleChange);
        cb.addEventListener('input', handleChange);
    });

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
    triggerLightboxAnimation('slide-in-right');
}

function prevLightboxImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
    updateLightboxView();
    triggerLightboxAnimation('slide-in-left');
}

function triggerLightboxAnimation(animationClass) {
    if (!lightboxImage) return;
    
    // Remove existing animation classes to reset state
    lightboxImage.classList.remove('slide-in-right', 'slide-in-left');
    
    // Trigger reflow to restart animation
    void lightboxImage.offsetWidth; 
    
    // Add the new animation class
    lightboxImage.classList.add(animationClass);
}

// Lightbox Swipe Gestures
let lightboxTouchStartX = 0;
let lightboxTouchStartY = 0;
let isLightboxZooming = false;

const lightboxModalDom = document.getElementById('lightboxModal');
if (lightboxModalDom) {
    lightboxModalDom.addEventListener('touchstart', (e) => {
        // If more than one finger is touching, it's a pinch-to-zoom or multi-touch gesture, not a swipe
        if (e.touches.length > 1) {
            isLightboxZooming = true;
            return;
        }
        
        // Reset zoom flag if starting a clean single-touch gesture
        if (e.touches.length === 1) {
            isLightboxZooming = false;
        }

        lightboxTouchStartX = e.changedTouches[0].screenX;
        lightboxTouchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    lightboxModalDom.addEventListener('touchmove', (e) => {
        // Continually monitor during the move; if a second finger comes down, cancel the swipe
        if (e.touches.length > 1) {
            isLightboxZooming = true;
        }
    }, { passive: true });

    lightboxModalDom.addEventListener('touchend', (e) => {
        // If this gesture involved zooming at any point, completely ignore the swipe logic
        if (isLightboxZooming) {
            // Only reset once all fingers are off the screen to prevent accidental triggers on release
            if (e.touches.length === 0) {
                isLightboxZooming = false;
            }
            return;
        }

        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        const deltaX = touchEndX - lightboxTouchStartX;
        const deltaY = touchEndY - lightboxTouchStartY;
        
        // Ensure a minimum swipe distance to avoid accidental triggers
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal Swipe
            if (Math.abs(deltaX) > 50 && currentLightboxImages.length > 1) {
                if (deltaX > 0) {
                    // Swiped right -> Previous image
                    prevLightboxImage();
                } else {
                    // Swiped left -> Next image
                    nextLightboxImage();
                }
            }
        } else {
            // Vertical Swipe
            if (Math.abs(deltaY) > 50) { 
                // Swiped up or down -> Close
                closeLightbox();
            }
        }
    }, { passive: true });
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
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Quill Rich Text Editor
    quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Zubereitungsschritte hier eingeben...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    });

    // Run the rest of the boot sequence
    await initApp();
});

// Service Worker Registration and Auto-Update Logic
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);

            // Listen for waiting service workers (updates ready)
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    // Has the new worker installed successfully?
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // There's a new update ready! Force the waiting worker to activate immediately.
                        console.log("New PWA update installed. Forcing activation...");
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });

        // Whenever the controlling service worker changes (a new version took over),
        // forcefully reload the entire page to apply the new assets.
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                console.log("New Service Worker activated. Reloading app...");
                refreshing = true;
                window.location.reload(true);
            }
        });
    });
}
