/**
 * Tenant Extraction Middleware
 *
 * Identifies which customer/tenant is making the request based on:
 * 1. Subdomain (customera.reasonex.com -> 'customer-a')
 * 2. Custom domain (customera.com -> 'customer-a')
 * 3. X-Tenant-Id header (for API testing)
 *
 * Sets req.tenantId for use in all downstream handlers
 */

const { Pool } = require('pg');

// Cache tenant lookups to avoid DB queries on every request
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract tenant ID from request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const extractTenant = async (req, res, next) => {
    let tenantId = null;

    // Get database pool from app locals (set during server initialization)
    const pool = req.app.locals.pool;

    try {
        // Method 1: From X-Tenant-Id header (highest priority, for testing/API)
        if (req.headers['x-tenant-id']) {
            tenantId = req.headers['x-tenant-id'];
            console.log('[Tenant] Extracted from header:', tenantId);
        }

        // Method 2: From subdomain (customera.reasonex.com)
        if (!tenantId) {
            const host = req.headers.host || '';
            const parts = host.split('.');

            // If domain has 3+ parts, first part is subdomain
            if (parts.length >= 3) {
                const subdomain = parts[0].toLowerCase();

                // Skip common subdomains
                if (!['www', 'api', 'admin'].includes(subdomain)) {
                    // Check cache first
                    const cacheKey = `subdomain:${subdomain}`;
                    const cached = tenantCache.get(cacheKey);

                    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
                        tenantId = cached.tenantId;
                        console.log('[Tenant] From cache (subdomain):', tenantId);
                    } else {
                        // Query database
                        const result = await pool.query(
                            'SELECT id FROM tenants WHERE subdomain = $1 AND active = true',
                            [subdomain]
                        );

                        if (result.rows[0]) {
                            tenantId = result.rows[0].id;
                            // Cache the result
                            tenantCache.set(cacheKey, { tenantId, timestamp: Date.now() });
                            console.log('[Tenant] From database (subdomain):', tenantId);
                        }
                    }
                }
            }
        }

        // Method 3: From custom domain (customera.com)
        if (!tenantId) {
            const host = (req.headers.host || '').replace(/:\d+$/, ''); // Remove port

            // Check cache first
            const cacheKey = `domain:${host}`;
            const cached = tenantCache.get(cacheKey);

            if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
                tenantId = cached.tenantId;
                console.log('[Tenant] From cache (domain):', tenantId);
            } else {
                // Query database
                const result = await pool.query(
                    'SELECT id FROM tenants WHERE domain = $1 AND active = true',
                    [host]
                );

                if (result.rows[0]) {
                    tenantId = result.rows[0].id;
                    // Cache the result
                    tenantCache.set(cacheKey, { tenantId, timestamp: Date.now() });
                    console.log('[Tenant] From database (domain):', tenantId);
                }
            }
        }

        // Default: Use 'reasonex' tenant if no tenant identified
        if (!tenantId) {
            tenantId = 'reasonex';
            console.log('[Tenant] Using default tenant:', tenantId);
        }

        // Set tenant on request object for downstream handlers
        req.tenantId = tenantId;

        // Set PostgreSQL session variable for Row-Level Security (RLS)
        try {
            await pool.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
        } catch (err) {
            console.warn('[Tenant] Failed to set session variable (RLS may not work):', err.message);
        }

        next();
    } catch (error) {
        console.error('[Tenant] Error extracting tenant:', error);
        // Default to 'reasonex' on error
        req.tenantId = 'reasonex';
        next();
    }
};

/**
 * Validate that user has access to the tenant
 *
 * Checks that the authenticated user's email is authorized for the current tenant
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateTenantAccess = async (req, res, next) => {
    const pool = req.app.locals.pool;
    const userEmail = req.user?.email;
    const tenantId = req.tenantId;

    if (!userEmail) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    try {
        // Check if user is authorized for this tenant
        const result = await pool.query(
            'SELECT * FROM authorized_users WHERE email = $1 AND tenant_id = $2',
            [userEmail, tenantId]
        );

        if (result.rows.length === 0) {
            console.warn(`[Tenant] Access denied: ${userEmail} not authorized for tenant ${tenantId}`);
            return res.status(403).json({
                error: 'Access denied',
                message: 'You are not authorized to access this tenant',
                tenant: tenantId
            });
        }

        console.log(`[Tenant] Access granted: ${userEmail} authorized for tenant ${tenantId}`);
        next();
    } catch (error) {
        console.error('[Tenant] Error validating tenant access:', error);
        return res.status(500).json({ error: 'Failed to validate tenant access' });
    }
};

/**
 * Validate that a resource belongs to the current tenant
 *
 * Prevents cross-tenant data access by verifying resource ownership
 *
 * @param {string} table - Table name (e.g., 'jobs', 'candidates')
 * @param {string} idParam - Request parameter containing resource ID (e.g., 'id', 'jobId')
 * @returns {Function} Express middleware function
 */
const validateResourceTenant = (table, idParam = 'id') => {
    return async (req, res, next) => {
        const pool = req.app.locals.pool;
        const resourceId = req.params[idParam] || req.body[idParam];
        const tenantId = req.tenantId;

        if (!resourceId) {
            return next(); // Skip validation if no ID provided
        }

        try {
            const result = await pool.query(
                `SELECT tenant_id FROM ${table} WHERE id = $1`,
                [resourceId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Resource not found' });
            }

            const resourceTenantId = result.rows[0].tenant_id;

            if (resourceTenantId !== tenantId) {
                console.warn(`[Tenant] Blocked cross-tenant access: User tenant=${tenantId}, Resource tenant=${resourceTenantId}`);
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'This resource belongs to a different tenant'
                });
            }

            next();
        } catch (error) {
            console.error(`[Tenant] Error validating resource tenant for ${table}:`, error);
            return res.status(500).json({ error: 'Failed to validate resource access' });
        }
    };
};

/**
 * Clear tenant cache (call this when tenants are added/modified)
 */
const clearTenantCache = () => {
    tenantCache.clear();
    console.log('[Tenant] Cache cleared');
};

/**
 * Get tenant info (for API responses)
 */
const getTenantInfo = async (pool, tenantId) => {
    try {
        const result = await pool.query(
            'SELECT id, name, settings FROM tenants WHERE id = $1',
            [tenantId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('[Tenant] Error getting tenant info:', error);
        return null;
    }
};

module.exports = {
    extractTenant,
    validateTenantAccess,
    validateResourceTenant,
    clearTenantCache,
    getTenantInfo
};
