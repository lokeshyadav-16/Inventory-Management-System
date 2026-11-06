/**
 * ====================================================================
 * Inventory Management System - Core Frontend Application
 * ====================================================================
 */

const App = (function () {
  // Application State
  const state = {
    currentView: 'dashboard',
    isBackendOnline: false,
    categories: [],
    suppliers: [],
    products: [],
    dashboardStats: null,
    stockFilter: 'all',
    deleteTarget: null // { type: 'product'|'category'|'supplier', id: number, name: string }
  };

  // Bootstrap Modal instances
  let modals = {};
  let toastInstance = null;
  let searchDebounceTimer = null;

  // ------------------------------------------------------------------
  // Initialization
  // ------------------------------------------------------------------
  const init = async () => {
    initModals();
    initEventListeners();
    await checkBackendConnection();
    await loadInitialData();
    handleRouteFromHash();
  };

  const initModals = () => {
    modals.product = new bootstrap.Modal(document.getElementById('productModal'));
    modals.productDetails = new bootstrap.Modal(document.getElementById('productDetailsModal'));
    modals.category = new bootstrap.Modal(document.getElementById('categoryModal'));
    modals.supplier = new bootstrap.Modal(document.getElementById('supplierModal'));
    modals.stockAdjustment = new bootstrap.Modal(document.getElementById('stockAdjustmentModal'));
    modals.deleteConfirm = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));

    const toastEl = document.getElementById('liveToast');
    if (toastEl) {
      toastInstance = new bootstrap.Toast(toastEl, { delay: 4000 });
    }
  };

  const initEventListeners = () => {
    // Navigation clicks
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-nav');
        navigateTo(targetView);
      });
    });

    // Hash change routing
    window.addEventListener('hashchange', handleRouteFromHash);

    // Sidebar toggle on mobile
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('show');
      });
    }

    // Global refresh button
    document.getElementById('globalRefreshBtn').addEventListener('click', async () => {
      showToast('Refreshing inventory data...', 'info');
      await refreshCurrentView();
    });

    // Low stock top button
    document.getElementById('lowStockHeaderBtn').addEventListener('click', () => {
      navigateTo('stock', 'low');
    });

    // Product search and filters
    const productSearch = document.getElementById('productSearchInput');
    if (productSearch) {
      productSearch.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(loadProducts, 300);
      });
    }

    ['productCategoryFilter', 'productSupplierFilter', 'productStockFilter', 'productSortBy'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', loadProducts);
    });

    document.getElementById('resetProductFiltersBtn').addEventListener('click', () => {
      document.getElementById('productSearchInput').value = '';
      document.getElementById('productCategoryFilter').value = 'all';
      document.getElementById('productSupplierFilter').value = 'all';
      document.getElementById('productStockFilter').value = 'all';
      document.getElementById('productSortBy').value = 'id';
      loadProducts();
    });

    // Category search
    const categorySearch = document.getElementById('categorySearchInput');
    if (categorySearch) {
      categorySearch.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(loadCategories, 300);
      });
    }

    // Supplier search
    const supplierSearch = document.getElementById('supplierSearchInput');
    if (supplierSearch) {
      supplierSearch.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(loadSuppliers, 300);
      });
    }

    // Form Submissions
    document.getElementById('productForm').addEventListener('submit', handleProductFormSubmit);
    document.getElementById('categoryForm').addEventListener('submit', handleCategoryFormSubmit);
    document.getElementById('supplierForm').addEventListener('submit', handleSupplierFormSubmit);
    document.getElementById('stockAdjustmentForm').addEventListener('submit', handleStockAdjustmentSubmit);
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);

    // Detail modal Edit button
    document.getElementById('detailEditBtn').addEventListener('click', () => {
      const rawId = document.getElementById('detailProductId').textContent || '';
      const productId = rawId.replace(/[^0-9]/g, '');
      modals.productDetails.hide();
      openProductModal(productId);
    });
  };

  // ------------------------------------------------------------------
  // Routing & View Management
  // ------------------------------------------------------------------
  const handleRouteFromHash = () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const parts = hash.split('?');
    const viewName = parts[0];
    navigateTo(viewName, false);
  };

  const navigateTo = (viewName, filterOrParam = null, updateHash = true) => {
    if (typeof filterOrParam === 'boolean') {
      updateHash = filterOrParam;
      filterOrParam = null;
    }

    const validViews = ['dashboard', 'products', 'categories', 'suppliers', 'stock'];
    const activeView = validViews.includes(viewName) ? viewName : 'dashboard';

    state.currentView = activeView;
    if (activeView === 'stock' && filterOrParam) {
      state.stockFilter = filterOrParam;
    }

    if (updateHash) {
      window.location.hash = activeView;
    }

    // Update Sidebar active state
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      if (link.getAttribute('data-nav') === activeView) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    document.getElementById('sidebar').classList.remove('show');

    // Switch View containers
    validViews.forEach(v => {
      const sectionEl = document.getElementById(`view-${v}`);
      if (sectionEl) {
        if (v === activeView) {
          sectionEl.classList.remove('d-none');
        } else {
          sectionEl.classList.add('d-none');
        }
      }
    });

    // Update header title
    const titles = {
      dashboard: 'System Dashboard',
      products: 'Products Management',
      categories: 'Categories Management',
      suppliers: 'Suppliers Management',
      stock: 'Stock Management & Reorders'
    };
    document.getElementById('pageTitle').textContent = titles[activeView] || 'Dashboard';

    // Refresh view specific data
    refreshCurrentView();
  };

  const refreshCurrentView = async () => {
    switch (state.currentView) {
      case 'dashboard':
        await loadDashboard();
        break;
      case 'products':
        await loadProducts();
        break;
      case 'categories':
        await loadCategories();
        break;
      case 'suppliers':
        await loadSuppliers();
        break;
      case 'stock':
        await loadStockView();
        break;
    }
  };

  // ------------------------------------------------------------------
  // System Health & Connection
  // ------------------------------------------------------------------
  const checkBackendConnection = async () => {
    const badge = document.getElementById('backendStatusBadge');
    const text = document.getElementById('backendStatusText');
    const offlineAlert = document.getElementById('offlineAlertBanner');

    try {
      await API.checkHealth();
      state.isBackendOnline = true;
      badge.className = 'system-badge online';
      text.textContent = 'Server Connected';
      offlineAlert.classList.add('d-none');
      return true;
    } catch (err) {
      state.isBackendOnline = false;
      badge.className = 'system-badge offline';
      text.textContent = 'Server Offline';
      offlineAlert.classList.remove('d-none');
      return false;
    }
  };

  const loadInitialData = async () => {
    try {
      await Promise.all([
        refreshCategoryOptions(),
        refreshSupplierOptions()
      ]);
    } catch (err) {
      console.warn('Initial data load error:', err.message);
    }
  };

  // ------------------------------------------------------------------
  // Dropdown Helpers
  // ------------------------------------------------------------------
  const refreshCategoryOptions = async () => {
    try {
      const res = await API.getCategories();
      state.categories = res.data || [];

      // Populate filter dropdown
      const filterSelect = document.getElementById('productCategoryFilter');
      if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">All Categories</option>';
        state.categories.forEach(c => {
          filterSelect.innerHTML += `<option value="${c.category_id}">${escapeHtml(c.category_name)}</option>`;
        });
        filterSelect.value = currentVal || 'all';
      }

      // Populate modal select
      const modalSelect = document.getElementById('productCategorySelect');
      if (modalSelect) {
        modalSelect.innerHTML = '<option value="">-- Select Category --</option>';
        state.categories.forEach(c => {
          modalSelect.innerHTML += `<option value="${c.category_id}">${escapeHtml(c.category_name)}</option>`;
        });
      }
    } catch (err) {
      console.warn('Failed to load categories for select:', err.message);
    }
  };

  const refreshSupplierOptions = async () => {
    try {
      const res = await API.getSuppliers();
      state.suppliers = res.data || [];

      // Populate filter dropdown
      const filterSelect = document.getElementById('productSupplierFilter');
      if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">All Suppliers</option>';
        state.suppliers.forEach(s => {
          filterSelect.innerHTML += `<option value="${s.supplier_id}">${escapeHtml(s.supplier_name)}</option>`;
        });
        filterSelect.value = currentVal || 'all';
      }

      // Populate modal select
      const modalSelect = document.getElementById('productSupplierSelect');
      if (modalSelect) {
        modalSelect.innerHTML = '<option value="">-- Select Supplier --</option>';
        state.suppliers.forEach(s => {
          modalSelect.innerHTML += `<option value="${s.supplier_id}">${escapeHtml(s.supplier_name)}</option>`;
        });
      }
    } catch (err) {
      console.warn('Failed to load suppliers for select:', err.message);
    }
  };

  // ------------------------------------------------------------------
  // 1. DASHBOARD VIEW
  // ------------------------------------------------------------------
  const loadDashboard = async () => {
    try {
      const res = await API.getDashboardStats();
      const stats = res.data;
      state.dashboardStats = stats;

      const summary = stats.summary || {};

      // Metric counters
      document.getElementById('statTotalProducts').textContent = summary.total_products || 0;
      document.getElementById('statTotalCategories').textContent = summary.total_categories || 0;
      document.getElementById('statTotalSuppliers').textContent = summary.total_suppliers || 0;
      document.getElementById('statTotalStock').textContent = Number(summary.total_stock || 0).toLocaleString();
      document.getElementById('statInventoryValue').textContent = formatCurrency(summary.total_inventory_value || 0);
      document.getElementById('statLowStockCount').textContent = summary.low_stock_count || 0;
      document.getElementById('statOutOfStockCount').textContent = summary.out_of_stock_count || 0;

      // Header notification pill
      const lowTotal = (summary.low_stock_count || 0) + (summary.out_of_stock_count || 0);
      document.getElementById('lowStockHeaderCount').textContent = lowTotal;

      // Low stock warning banner
      const banner = document.getElementById('dashboardLowStockBanner');
      if (lowTotal > 0) {
        banner.classList.remove('d-none');
        document.getElementById('lowStockBannerText').textContent = 
          `You have ${summary.out_of_stock_count || 0} out-of-stock items and ${summary.low_stock_count || 0} low-stock items needing attention.`;
      } else {
        banner.classList.add('d-none');
      }

      // Render Low Stock Reorder Table
      renderDashboardLowStock(stats.low_stock_items || []);

      // Render Category Breakdown
      renderDashboardCategoryDistribution(stats.category_distribution || []);

      // Render Recent Products
      renderDashboardRecentProducts(stats.recent_products || []);

    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  const renderDashboardLowStock = (items) => {
    const tbody = document.getElementById('dashboardLowStockBody');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-success">
            <i class="bi bi-check-circle-fill me-1"></i> All products are adequately stocked!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <div class="fw-semibold text-dark">${escapeHtml(item.product_name)}</div>
          <small class="text-muted">ID: #${item.product_id}</small>
        </td>
        <td>
          <span class="category-tag">${escapeHtml(item.category_name || 'Uncategorized')}</span>
        </td>
        <td>
          <span class="stock-badge ${item.quantity === 0 ? 'badge-out-stock' : 'badge-low-stock'}">
            ${item.quantity === 0 ? '<i class="bi bi-x-circle-fill"></i> 0 Units' : `<i class="bi bi-exclamation-triangle-fill"></i> ${item.quantity} Units`}
          </span>
        </td>
        <td>
          <small class="text-secondary d-block">${escapeHtml(item.supplier_name || 'No Supplier')}</small>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" onclick="App.quickAddStock(${item.product_id}, 10)" title="Quickly add 10 units">
              +10
            </button>
            <button class="btn btn-warning" onclick="App.openStockAdjustmentModal(${item.product_id}, '${escapeHtml(item.product_name)}', '${escapeHtml(item.category_name || '')}', ${item.quantity})">
              Adjust
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const renderDashboardCategoryDistribution = (categories) => {
    const container = document.getElementById('dashboardCategoryDistBody');
    if (!container) return;

    if (!categories || categories.length === 0) {
      container.innerHTML = '<div class="text-center py-3 text-muted">No category data available.</div>';
      return;
    }

    const totalProducts = categories.reduce((sum, c) => sum + (c.product_count || 0), 0) || 1;

    container.innerHTML = categories.map(c => {
      const pct = Math.round((c.product_count / totalProducts) * 100);
      return `
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="fw-semibold small text-dark">${escapeHtml(c.category_name)}</span>
            <span class="small text-muted">${c.product_count} items (${pct}%)</span>
          </div>
          <div class="progress" style="height: 6px;">
            <div class="progress-bar bg-primary" role="progressbar" style="width: ${pct}%" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </div>
      `;
    }).join('');
  };

  const renderDashboardRecentProducts = (products) => {
    const tbody = document.getElementById('dashboardRecentProductsBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">No products yet.</td></tr>';
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <div class="fw-semibold text-truncate" style="max-width: 170px;" title="${escapeHtml(p.product_name)}">${escapeHtml(p.product_name)}</div>
          <small class="text-muted">${escapeHtml(p.category_name || 'General')}</small>
        </td>
        <td class="fw-semibold text-dark">${formatCurrency(p.price)}</td>
        <td>
          <span class="stock-badge ${getStockBadgeClass(p.quantity)}">${p.quantity}</span>
        </td>
      </tr>
    `).join('');
  };

  // ------------------------------------------------------------------
  // 2. PRODUCTS MANAGEMENT VIEW
  // ------------------------------------------------------------------
  const loadProducts = async () => {
    const tbody = document.getElementById('productsTableBody');
    const countLabel = document.getElementById('productsCountLabel');

    try {
      const filters = {
        search: document.getElementById('productSearchInput').value.trim(),
        category_id: document.getElementById('productCategoryFilter').value,
        supplier_id: document.getElementById('productSupplierFilter').value,
        stock_status: document.getElementById('productStockFilter').value,
        sort_by: document.getElementById('productSortBy').value,
        sort_order: 'ASC'
      };

      const res = await API.getProducts(filters);
      state.products = res.data || [];

      countLabel.textContent = `Showing ${state.products.length} products`;

      if (state.products.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center py-5 text-muted">
              <i class="bi bi-inbox fs-2 d-block mb-2"></i>
              No products found matching the criteria.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = state.products.map(p => `
        <tr>
          <td class="text-muted fw-semibold">#${p.product_id}</td>
          <td>
            <div class="fw-bold text-dark">${escapeHtml(p.product_name)}</div>
            ${p.description ? `<small class="text-muted text-truncate d-inline-block" style="max-width: 280px;">${escapeHtml(p.description)}</small>` : ''}
          </td>
          <td>
            <span class="category-tag">${escapeHtml(p.category_name || 'Unassigned')}</span>
          </td>
          <td>
            <span class="text-secondary small">${escapeHtml(p.supplier_name || 'Unassigned')}</span>
          </td>
          <td class="fw-bold text-dark">${formatCurrency(p.price)}</td>
          <td>
            <span class="stock-badge ${getStockBadgeClass(p.quantity)}">
              ${getStockBadgeIcon(p.quantity)} ${p.quantity} units
            </span>
          </td>
          <td class="fw-semibold text-secondary">${formatCurrency(p.total_value)}</td>
          <td class="text-end">
            <div class="d-inline-flex gap-1">
              <button class="btn btn-action btn-outline-info" onclick="App.viewProductDetails(${p.product_id})" title="View Details">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-action btn-outline-primary" onclick="App.openProductModal(${p.product_id})" title="Edit Product">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-action btn-outline-warning" onclick="App.openStockAdjustmentModal(${p.product_id}, '${escapeHtml(p.product_name)}', '${escapeHtml(p.category_name || '')}', ${p.quantity})" title="Adjust Stock">
                <i class="bi bi-sliders"></i>
              </button>
              <button class="btn btn-action btn-outline-danger" onclick="App.promptDelete('product', ${p.product_id}, '${escapeHtml(p.product_name)}')" title="Delete Product">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">${escapeHtml(err.message)}</td></tr>`;
    }
  };

  const openProductModal = async (productId = null) => {
    await Promise.all([refreshCategoryOptions(), refreshSupplierOptions()]);

    const titleEl = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    form.reset();

    if (productId) {
      titleEl.textContent = 'Edit Product';
      document.getElementById('productIdInput').value = productId;

      try {
        const res = await API.getProduct(productId);
        const p = res.data;
        document.getElementById('productNameInput').value = p.product_name || '';
        document.getElementById('productCategorySelect').value = p.category_id || '';
        document.getElementById('productSupplierSelect').value = p.supplier_id || '';
        document.getElementById('productPriceInput').value = p.price || 0;
        document.getElementById('productQuantityInput').value = p.quantity || 0;
        document.getElementById('productDescriptionInput').value = p.description || '';
      } catch (err) {
        showToast(`Failed to load product details: ${err.message}`, 'danger');
        return;
      }
    } else {
      titleEl.textContent = 'Add New Product';
      document.getElementById('productIdInput').value = '';
    }

    modals.product.show();
  };

  const handleProductFormSubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('productIdInput').value;

    const payload = {
      product_name: document.getElementById('productNameInput').value.trim(),
      category_id: document.getElementById('productCategorySelect').value || null,
      supplier_id: document.getElementById('productSupplierSelect').value || null,
      price: parseFloat(document.getElementById('productPriceInput').value),
      quantity: parseInt(document.getElementById('productQuantityInput').value, 10),
      description: document.getElementById('productDescriptionInput').value.trim()
    };

    try {
      if (id) {
        await API.updateProduct(id, payload);
        showToast('Product updated successfully.', 'success');
      } else {
        await API.createProduct(payload);
        showToast('Product added successfully.', 'success');
      }

      modals.product.hide();
      await loadProducts();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const viewProductDetails = async (productId) => {
    try {
      const res = await API.getProduct(productId);
      const p = res.data;

      document.getElementById('detailProductId').textContent = `#${p.product_id}`;
      document.getElementById('detailProductId').dataset.id = p.product_id;
      document.getElementById('detailProductName').textContent = p.product_name;
      document.getElementById('detailCategoryName').textContent = p.category_name || 'No Category Assigned';
      document.getElementById('detailProductPrice').textContent = formatCurrency(p.price);
      document.getElementById('detailTotalValue').textContent = formatCurrency(p.total_value);
      document.getElementById('detailQuantity').textContent = `${p.quantity} units`;
      document.getElementById('detailSupplierName').textContent = p.supplier_name || 'No Supplier Assigned';
      document.getElementById('detailSupplierContact').textContent = 
        p.supplier_email ? `${p.supplier_email} (${p.supplier_phone || ''})` : 'N/A';
      document.getElementById('detailCreatedAt').textContent = new Date(p.created_at).toLocaleString();
      document.getElementById('detailDescription').textContent = p.description || 'No description provided for this item.';

      const badgeContainer = document.getElementById('detailStockBadge');
      badgeContainer.innerHTML = `
        <span class="stock-badge ${getStockBadgeClass(p.quantity)}">
          ${getStockBadgeIcon(p.quantity)} ${p.stock_status.replace(/_/g, ' ')}
        </span>
      `;

      modals.productDetails.show();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    }
  };

  // ------------------------------------------------------------------
  // 3. CATEGORIES MANAGEMENT VIEW
  // ------------------------------------------------------------------
  const loadCategories = async () => {
    const tbody = document.getElementById('categoriesTableBody');
    try {
      const search = document.getElementById('categorySearchInput').value.trim();
      const res = await API.getCategories(search);
      state.categories = res.data || [];

      if (state.categories.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-5 text-muted">
              No categories found. Click "Add Category" to create one.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = state.categories.map(c => `
        <tr>
          <td class="text-muted fw-semibold">#${c.category_id}</td>
          <td class="fw-bold text-dark">${escapeHtml(c.category_name)}</td>
          <td class="text-secondary">${escapeHtml(c.description || 'No description.')}</td>
          <td>
            <button class="btn btn-sm btn-light border" onclick="App.filterProductsByCategory(${c.category_id})" title="View products in this category">
              <i class="bi bi-box me-1"></i> ${c.product_count || 0} Products
            </button>
          </td>
          <td class="fw-semibold text-dark">${c.total_items_in_stock || 0} Units</td>
          <td class="text-end">
            <div class="d-inline-flex gap-1">
              <button class="btn btn-action btn-outline-primary" onclick="App.openCategoryModal(${c.category_id})" title="Edit Category">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-action btn-outline-danger" onclick="App.promptDelete('category', ${c.category_id}, '${escapeHtml(c.category_name)}')" title="Delete Category">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${escapeHtml(err.message)}</td></tr>`;
    }
  };

  const openCategoryModal = async (categoryId = null) => {
    const form = document.getElementById('categoryForm');
    form.reset();

    const titleEl = document.getElementById('categoryModalTitle');
    if (categoryId) {
      titleEl.textContent = 'Edit Category';
      document.getElementById('categoryIdInput').value = categoryId;
      try {
        const res = await API.getCategory(categoryId);
        const c = res.data;
        document.getElementById('categoryNameInput').value = c.category_name;
        document.getElementById('categoryDescInput').value = c.description || '';
      } catch (err) {
        showToast(err.message, 'danger');
        return;
      }
    } else {
      titleEl.textContent = 'Add New Category';
      document.getElementById('categoryIdInput').value = '';
    }

    modals.category.show();
  };

  const handleCategoryFormSubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('categoryIdInput').value;
    const payload = {
      category_name: document.getElementById('categoryNameInput').value.trim(),
      description: document.getElementById('categoryDescInput').value.trim()
    };

    try {
      if (id) {
        await API.updateCategory(id, payload);
        showToast('Category updated successfully.', 'success');
      } else {
        await API.createCategory(payload);
        showToast('Category created successfully.', 'success');
      }

      modals.category.hide();
      await loadCategories();
      await refreshCategoryOptions();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const filterProductsByCategory = (categoryId) => {
    navigateTo('products');
    setTimeout(() => {
      document.getElementById('productCategoryFilter').value = categoryId;
      loadProducts();
    }, 100);
  };

  // ------------------------------------------------------------------
  // 4. SUPPLIERS MANAGEMENT VIEW
  // ------------------------------------------------------------------
  const loadSuppliers = async () => {
    const tbody = document.getElementById('suppliersTableBody');
    try {
      const search = document.getElementById('supplierSearchInput').value.trim();
      const res = await API.getSuppliers(search);
      state.suppliers = res.data || [];

      if (state.suppliers.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-5 text-muted">
              No suppliers found. Click "Add Supplier" to register one.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = state.suppliers.map(s => `
        <tr>
          <td class="text-muted fw-semibold">#${s.supplier_id}</td>
          <td>
            <div class="fw-bold text-dark">${escapeHtml(s.supplier_name)}</div>
          </td>
          <td>
            <a href="mailto:${escapeHtml(s.email)}" class="text-decoration-none">
              <i class="bi bi-envelope me-1"></i> ${escapeHtml(s.email)}
            </a>
          </td>
          <td>
            <a href="tel:${escapeHtml(s.phone)}" class="text-decoration-none text-secondary">
              <i class="bi bi-telephone me-1"></i> ${escapeHtml(s.phone)}
            </a>
          </td>
          <td>
            <small class="text-muted">${escapeHtml(s.address || 'No address provided.')}</small>
          </td>
          <td>
            <button class="btn btn-sm btn-light border" onclick="App.filterProductsBySupplier(${s.supplier_id})" title="View products from this supplier">
              <i class="bi bi-box me-1"></i> ${s.products_supplied || 0} Products
            </button>
          </td>
          <td class="text-end">
            <div class="d-inline-flex gap-1">
              <button class="btn btn-action btn-outline-primary" onclick="App.openSupplierModal(${s.supplier_id})" title="Edit Supplier">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-action btn-outline-danger" onclick="App.promptDelete('supplier', ${s.supplier_id}, '${escapeHtml(s.supplier_name)}')" title="Delete Supplier">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">${escapeHtml(err.message)}</td></tr>`;
    }
  };

  const openSupplierModal = async (supplierId = null) => {
    const form = document.getElementById('supplierForm');
    form.reset();

    const titleEl = document.getElementById('supplierModalTitle');
    if (supplierId) {
      titleEl.textContent = 'Edit Supplier';
      document.getElementById('supplierIdInput').value = supplierId;
      try {
        const res = await API.getSupplier(supplierId);
        const s = res.data;
        document.getElementById('supplierNameInput').value = s.supplier_name;
        document.getElementById('supplierEmailInput').value = s.email;
        document.getElementById('supplierPhoneInput').value = s.phone;
        document.getElementById('supplierAddressInput').value = s.address || '';
      } catch (err) {
        showToast(err.message, 'danger');
        return;
      }
    } else {
      titleEl.textContent = 'Add New Supplier';
      document.getElementById('supplierIdInput').value = '';
    }

    modals.supplier.show();
  };

  const handleSupplierFormSubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('supplierIdInput').value;
    const payload = {
      supplier_name: document.getElementById('supplierNameInput').value.trim(),
      email: document.getElementById('supplierEmailInput').value.trim(),
      phone: document.getElementById('supplierPhoneInput').value.trim(),
      address: document.getElementById('supplierAddressInput').value.trim()
    };

    try {
      if (id) {
        await API.updateSupplier(id, payload);
        showToast('Supplier updated successfully.', 'success');
      } else {
        await API.createSupplier(payload);
        showToast('Supplier created successfully.', 'success');
      }

      modals.supplier.hide();
      await loadSuppliers();
      await refreshSupplierOptions();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const filterProductsBySupplier = (supplierId) => {
    navigateTo('products');
    setTimeout(() => {
      document.getElementById('productSupplierFilter').value = supplierId;
      loadProducts();
    }, 100);
  };

  // ------------------------------------------------------------------
  // 5. STOCK MANAGEMENT & QUICK OPERATIONS
  // ------------------------------------------------------------------
  const loadStockView = async () => {
    const tbody = document.getElementById('stockControlTableBody');
    try {
      const res = await API.getProducts({ sort_by: 'quantity', sort_order: 'ASC' });
      const products = res.data || [];

      // Update count indicators
      const countAll = products.length;
      const countLow = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
      const countOut = products.filter(p => p.quantity === 0).length;

      document.getElementById('stockCountAll').textContent = countAll;
      document.getElementById('stockCountLow').textContent = countLow;
      document.getElementById('stockCountOut').textContent = countOut;

      // Update button active state
      document.querySelectorAll('[data-stock-filter]').forEach(b => {
        if (b.getAttribute('data-stock-filter') === state.stockFilter) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Filter according to active button
      let filtered = products;
      if (state.stockFilter === 'low') {
        filtered = products.filter(p => p.quantity > 0 && p.quantity <= 5);
      } else if (state.stockFilter === 'out') {
        filtered = products.filter(p => p.quantity === 0);
      } else if (state.stockFilter === 'in') {
        filtered = products.filter(p => p.quantity > 5);
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-5 text-muted">
              No products found for this stock filter.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td>
            <div class="fw-bold text-dark">${escapeHtml(p.product_name)}</div>
            <small class="text-muted">ID: #${p.product_id}</small>
          </td>
          <td><span class="category-tag">${escapeHtml(p.category_name || 'N/A')}</span></td>
          <td><small class="text-secondary">${escapeHtml(p.supplier_name || 'N/A')}</small></td>
          <td>
            <span class="fs-5 fw-bold text-dark">${p.quantity}</span>
            <small class="text-muted">units</small>
          </td>
          <td>
            <span class="stock-badge ${getStockBadgeClass(p.quantity)}">
              ${getStockBadgeIcon(p.quantity)} ${p.stock_status.replace(/_/g, ' ')}
            </span>
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-success" onclick="App.quickAddStock(${p.product_id}, 1)" title="Add 1 unit">+1</button>
              <button class="btn btn-outline-success" onclick="App.quickAddStock(${p.product_id}, 5)" title="Add 5 units">+5</button>
              <button class="btn btn-outline-success" onclick="App.quickAddStock(${p.product_id}, 10)" title="Add 10 units">+10</button>
              <button class="btn btn-outline-danger" onclick="App.quickSubtractStock(${p.product_id}, 1, ${p.quantity})" title="Deduct 1 unit">-1</button>
              <button class="btn btn-warning text-dark fw-semibold" onclick="App.openStockAdjustmentModal(${p.product_id}, '${escapeHtml(p.product_name)}', '${escapeHtml(p.category_name || '')}', ${p.quantity})">
                <i class="bi bi-gear-fill me-1"></i> Custom Adjust
              </button>
            </div>
          </td>
        </tr>
      `).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${escapeHtml(err.message)}</td></tr>`;
    }
  };

  const filterStockView = (filterType, buttonEl) => {
    state.stockFilter = filterType;
    document.querySelectorAll('[data-stock-filter]').forEach(b => b.classList.remove('active'));
    if (buttonEl) buttonEl.classList.add('active');
    loadStockView();
  };

  const quickAddStock = async (productId, amount) => {
    try {
      await API.adjustStock(productId, 'add', amount, 'Quick restock button');
      showToast(`Added +${amount} units to stock!`, 'success');
      await refreshCurrentView();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const quickSubtractStock = async (productId, amount, currentQty) => {
    if (currentQty <= 0) {
      showToast('Cannot deduct from out-of-stock item!', 'warning');
      return;
    }
    try {
      await API.adjustStock(productId, 'subtract', amount, 'Quick sale deduction');
      showToast(`Deducted -${amount} unit from stock!`, 'success');
      await refreshCurrentView();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const openStockAdjustmentModal = (productId, name, category, currentQty) => {
    document.getElementById('adjustProductId').value = productId;
    document.getElementById('adjustProductName').textContent = name;
    document.getElementById('adjustProductCategory').textContent = category || 'General';
    document.getElementById('adjustCurrentQty').textContent = `${currentQty} units`;
    document.getElementById('adjustAmountInput').value = 10;
    document.getElementById('adjustReasonInput').value = '';
    document.getElementById('adjustTypeAdd').checked = true;

    modals.stockAdjustment.show();
  };

  const handleStockAdjustmentSubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('adjustProductId').value;
    const type = document.querySelector('input[name="adjustType"]:checked').value;
    const amount = parseInt(document.getElementById('adjustAmountInput').value, 10);
    const reason = document.getElementById('adjustReasonInput').value.trim();

    try {
      await API.adjustStock(id, type, amount, reason);
      showToast('Stock quantity updated successfully.', 'success');
      modals.stockAdjustment.hide();
      await refreshCurrentView();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // ------------------------------------------------------------------
  // 6. DELETION HANDLER
  // ------------------------------------------------------------------
  const promptDelete = (type, id, name) => {
    state.deleteTarget = { type, id, name };
    const msgEl = document.getElementById('deleteConfirmMessage');

    if (type === 'product') {
      msgEl.innerHTML = `Are you sure you want to delete the product <strong>"${name}"</strong>?`;
    } else if (type === 'category') {
      msgEl.innerHTML = `Are you sure you want to delete the category <strong>"${name}"</strong>? Products in this category will become uncategorized.`;
    } else if (type === 'supplier') {
      msgEl.innerHTML = `Are you sure you want to delete the supplier <strong>"${name}"</strong>? Associated products will have their supplier set to null.`;
    }

    modals.deleteConfirm.show();
  };

  const handleConfirmDelete = async () => {
    if (!state.deleteTarget) return;
    const { type, id, name } = state.deleteTarget;

    try {
      if (type === 'product') {
        await API.deleteProduct(id);
        showToast(`Product "${name}" deleted.`, 'success');
        await loadProducts();
      } else if (type === 'category') {
        await API.deleteCategory(id);
        showToast(`Category "${name}" deleted.`, 'success');
        await loadCategories();
        await refreshCategoryOptions();
      } else if (type === 'supplier') {
        await API.deleteSupplier(id);
        showToast(`Supplier "${name}" deleted.`, 'success');
        await loadSuppliers();
        await refreshSupplierOptions();
      }

      modals.deleteConfirm.hide();
      await loadDashboard();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'danger');
    }
  };

  // ------------------------------------------------------------------
  // Helper Utilities
  // ------------------------------------------------------------------
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const getStockBadgeClass = (qty) => {
    if (qty === 0) return 'badge-out-stock';
    if (qty <= 5) return 'badge-low-stock';
    return 'badge-in-stock';
  };

  const getStockBadgeIcon = (qty) => {
    if (qty === 0) return '<i class="bi bi-x-circle-fill"></i>';
    if (qty <= 5) return '<i class="bi bi-exclamation-triangle-fill"></i>';
    return '<i class="bi bi-check-circle-fill"></i>';
  };

  const showToast = (message, type = 'success') => {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toastMessage');

    const icons = {
      success: '<i class="bi bi-check-circle-fill text-success fs-5"></i>',
      danger: '<i class="bi bi-exclamation-circle-fill text-danger fs-5"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill text-warning fs-5"></i>',
      info: '<i class="bi bi-info-circle-fill text-info fs-5"></i>'
    };

    toastBody.innerHTML = `${icons[type] || icons.info} <span>${escapeHtml(message)}</span>`;
    if (toastInstance) {
      toastInstance.show();
    }
  };

  // Public API
  return {
    init,
    navigateTo,
    checkBackendConnection,
    openProductModal,
    viewProductDetails,
    openCategoryModal,
    filterProductsByCategory,
    openSupplierModal,
    filterProductsBySupplier,
    openStockAdjustmentModal,
    quickAddStock,
    quickSubtractStock,
    filterStockView,
    promptDelete
  };
})();

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
