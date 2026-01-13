/**
 * Search Routes
 * Advanced search and filtering
 */

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const searchController = require('../controllers/searchController');

// All search routes require authentication
router.use(isAuthenticated);

/**
 * PAGE ROUTES
 */

/**
 * GET /search
 * Display advanced search page
 */
router.get('/', searchController.index);

/**
 * API ROUTES
 */

/**
 * GET /api/search/tickets
 * Search tickets with advanced filters
 */
router.get('/api/tickets', searchController.apiSearchTickets);

/**
 * GET /api/search/suggestions
 * Get search suggestions
 */
router.get('/api/suggestions', searchController.apiGetSuggestions);

/**
 * GET /api/search/export
 * Export search results as CSV
 */
router.get('/api/export', searchController.apiExportResults);

/**
 * GET /api/search/filters/options
 * Get available filter options
 */
router.get('/api/filters/options', searchController.apiGetFilterOptions);

module.exports = router;
