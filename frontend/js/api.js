/**
 * ====================================================================
 * Inventory Management System - API Client Service
 * ====================================================================
 */

const API_BASE_URL = (function () {
  // If served directly by backend or reverse proxy
  if (window.location.origin.includes('5000')) {
    return '/api';
  }
  // Default to standard local backend URL
  return 'http://localhost:5000/api';
})();

class ApiService {
  /**
   * Internal HTTP request wrapper with robust error handling
   */
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        error.errors = data.errors || [];
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        const networkError = new Error('Cannot connect to the backend server. Please verify the Node.js server is running on port 5000.');
        networkError.isNetworkError = true;
        throw networkError;
      }
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // System Health
  // ------------------------------------------------------------------
  static async checkHealth() {
    return this.request('/health');
  }

  // ------------------------------------------------------------------
  // Dashboard & Statistics
  // ------------------------------------------------------------------
  static async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  static async getLowStockAlerts(threshold = 5) {
    return this.request(`/dashboard/low-stock?threshold=${threshold}`);
  }

  // ------------------------------------------------------------------
  // Products Management
  // ------------------------------------------------------------------
  static async getProducts(filters = {}) {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.category_id && filters.category_id !== 'all') query.append('category_id', filters.category_id);
    if (filters.supplier_id && filters.supplier_id !== 'all') query.append('supplier_id', filters.supplier_id);
    if (filters.stock_status && filters.stock_status !== 'all') query.append('stock_status', filters.stock_status);
    if (filters.sort_by) query.append('sort_by', filters.sort_by);
    if (filters.sort_order) query.append('sort_order', filters.sort_order);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/products${queryString}`);
  }

  static async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  static async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  static async updateProduct(id, productData) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  static async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  static async adjustStock(id, adjustmentType, amount, reason = '') {
    return this.request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({
        adjustment_type: adjustmentType,
        amount: parseInt(amount, 10),
        reason
      })
    });
  }

  // ------------------------------------------------------------------
  // Categories Management
  // ------------------------------------------------------------------
  static async getCategories(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/categories${query}`);
  }

  static async getCategory(id) {
    return this.request(`/categories/${id}`);
  }

  static async createCategory(categoryData) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  }

  static async updateCategory(id, categoryData) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
  }

  static async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE'
    });
  }

  // ------------------------------------------------------------------
  // Suppliers Management
  // ------------------------------------------------------------------
  static async getSuppliers(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/suppliers${query}`);
  }

  static async getSupplier(id) {
    return this.request(`/suppliers/${id}`);
  }

  static async createSupplier(supplierData) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData)
    });
  }

  static async updateSupplier(id, supplierData) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData)
    });
  }

  static async deleteSupplier(id) {
    return this.request(`/suppliers/${id}`, {
      method: 'DELETE'
    });
  }
}

// Attach to window object for global availability
window.API = ApiService;
