/**
 * Tenant Isolation Test Script
 *
 * Tests that multi-tenant isolation is working correctly:
 * 1. Data from tenant A is not visible to tenant B
 * 2. Users from tenant A cannot modify tenant B's data
 * 3. Tenant middleware correctly extracts tenant from headers
 *
 * Run with: node backend/test-tenant-isolation.js
 */

const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AUTH_TOKEN = 'DEV_TOKEN_REASONEX';

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

const log = (message, color = 'reset') => {
    console.log(`${colors[color]}${message}${colors.reset}`);
};

// Test helper
let testCount = 0;
let passCount = 0;
let failCount = 0;

const test = async (name, fn) => {
    testCount++;
    process.stdout.write(`\n${testCount}. ${name}... `);
    try {
        await fn();
        passCount++;
        log('✓ PASS', 'green');
    } catch (error) {
        failCount++;
        log('✗ FAIL', 'red');
        log(`   Error: ${error.message}`, 'red');
    }
};

// API helper
const api = async (endpoint, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...options.headers
    };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return { status: response.status, data };
};

// Main test suite
async function runTests() {
    log('\n' + '='.repeat(60), 'blue');
    log('MULTI-TENANT ISOLATION TEST SUITE', 'blue');
    log('='.repeat(60) + '\n', 'blue');

    log(`Testing backend at: ${BACKEND_URL}\n`, 'yellow');

    // ========================================
    // Test 1: Tenant Extraction from Header
    // ========================================
    await test('Tenant extracted from X-Tenant-Id header', async () => {
        const { data } = await api('/api/init', {
            headers: { 'X-Tenant-Id': 'customer-a' }
        });

        if (!data.clients || !Array.isArray(data.clients)) {
            throw new Error('Response should include clients array');
        }
    });

    // ========================================
    // Test 2: Create Data for Tenant A
    // ========================================
    let tenantAJobId = null;
    let tenantACandidateId = null;

    await test('Create job for tenant A', async () => {
        tenantAJobId = `test-job-a-${Date.now()}`;
        const { data } = await api('/api/jobs', {
            method: 'POST',
            headers: { 'X-Tenant-Id': 'customer-a' },
            body: JSON.stringify({
                id: tenantAJobId,
                clientId: 'test-client-a',
                title: 'Test Job for Tenant A',
                status: 'Active',
                createdAt: new Date().toISOString()
            })
        });

        if (!data.success) {
            throw new Error('Job creation failed');
        }
    });

    await test('Create candidate for tenant A', async () => {
        tenantACandidateId = `test-cand-a-${Date.now()}`;
        const { data } = await api('/api/candidates', {
            method: 'POST',
            headers: { 'X-Tenant-Id': 'customer-a' },
            body: JSON.stringify({
                id: tenantACandidateId,
                jobId: tenantAJobId,
                name: 'Test Candidate A',
                role: 'Engineer',
                company: 'Company A',
                stage: 'Identified',
                matchScore: 80,
                source: 'Test',
                addedAt: new Date().toISOString()
            })
        });

        if (!data.success) {
            throw new Error('Candidate creation failed');
        }
    });

    // ========================================
    // Test 3: Create Data for Tenant B
    // ========================================
    let tenantBJobId = null;
    let tenantBCandidateId = null;

    await test('Create job for tenant B', async () => {
        tenantBJobId = `test-job-b-${Date.now()}`;
        const { data } = await api('/api/jobs', {
            method: 'POST',
            headers: { 'X-Tenant-Id': 'customer-b' },
            body: JSON.stringify({
                id: tenantBJobId,
                clientId: 'test-client-b',
                title: 'Test Job for Tenant B',
                status: 'Active',
                createdAt: new Date().toISOString()
            })
        });

        if (!data.success) {
            throw new Error('Job creation failed');
        }
    });

    await test('Create candidate for tenant B', async () => {
        tenantBCandidateId = `test-cand-b-${Date.now()}`;
        const { data } = await api('/api/candidates', {
            method: 'POST',
            headers: { 'X-Tenant-Id': 'customer-b' },
            body: JSON.stringify({
                id: tenantBCandidateId,
                jobId: tenantBJobId,
                name: 'Test Candidate B',
                role: 'Developer',
                company: 'Company B',
                stage: 'Identified',
                matchScore: 75,
                source: 'Test',
                addedAt: new Date().toISOString()
            })
        });

        if (!data.success) {
            throw new Error('Candidate creation failed');
        }
    });

    // ========================================
    // Test 4: Verify Isolation (Tenant A cannot see Tenant B's data)
    // ========================================
    await test('Tenant A cannot see Tenant B jobs', async () => {
        const { data } = await api('/api/init', {
            headers: { 'X-Tenant-Id': 'customer-a' }
        });

        const tenantBJob = data.jobs.find(j => j.id === tenantBJobId);
        if (tenantBJob) {
            throw new Error('Tenant A can see Tenant B job - ISOLATION BREACH!');
        }
    });

    await test('Tenant A cannot see Tenant B candidates', async () => {
        const { data } = await api('/api/init', {
            headers: { 'X-Tenant-Id': 'customer-a' }
        });

        const tenantBCandidate = data.candidates.find(c => c.id === tenantBCandidateId);
        if (tenantBCandidate) {
            throw new Error('Tenant A can see Tenant B candidate - ISOLATION BREACH!');
        }
    });

    await test('Tenant B cannot see Tenant A jobs', async () => {
        const { data } = await api('/api/init', {
            headers: { 'X-Tenant-Id': 'customer-b' }
        });

        const tenantAJob = data.jobs.find(j => j.id === tenantAJobId);
        if (tenantAJob) {
            throw new Error('Tenant B can see Tenant A job - ISOLATION BREACH!');
        }
    });

    await test('Tenant B cannot see Tenant A candidates', async () => {
        const { data } = await api('/api/init', {
            headers: { 'X-Tenant-Id': 'customer-b' }
        });

        const tenantACandidate = data.candidates.find(c => c.id === tenantACandidateId);
        if (tenantACandidate) {
            throw new Error('Tenant B can see Tenant A candidate - ISOLATION BREACH!');
        }
    });

    // ========================================
    // Test 5: Verify Tenant A can see its own data
    // ========================================
    await test('Tenant A can see its own job', async () => {
        const { data } = await api('/api/init', {
            headers: { 'X-Tenant-Id': 'customer-a' }
        });

        const ownJob = data.jobs.find(j => j.id === tenantAJobId);
        if (!ownJob) {
            throw new Error('Tenant A cannot see its own job');
        }
    });

    await test('Tenant A can see its own candidate', async () => {
        const { data } = await api('/api/init', {
            headers: { 'X-Tenant-Id': 'customer-a' }
        });

        const ownCandidate = data.candidates.find(c => c.id === tenantACandidateId);
        if (!ownCandidate) {
            throw new Error('Tenant A cannot see its own candidate');
        }
    });

    // ========================================
    // Test 6: Verify Cross-Tenant Modification Prevention
    // ========================================
    await test('Tenant A cannot delete Tenant B job', async () => {
        try {
            await api(`/api/jobs/${tenantBJobId}`, {
                method: 'DELETE',
                headers: { 'X-Tenant-Id': 'customer-a' }
            });
            throw new Error('Delete should have failed but succeeded - SECURITY ISSUE!');
        } catch (error) {
            // Expected to fail - deletion should not affect other tenant's data
            if (error.message.includes('SECURITY ISSUE')) {
                throw error;
            }
        }
    });

    await test('Tenant A cannot delete Tenant B candidate', async () => {
        try {
            await api(`/api/candidates/${tenantBCandidateId}`, {
                method: 'DELETE',
                headers: { 'X-Tenant-Id': 'customer-a' }
            });
            throw new Error('Delete should have failed but succeeded - SECURITY ISSUE!');
        } catch (error) {
            // Expected to fail
            if (error.message.includes('SECURITY ISSUE')) {
                throw error;
            }
        }
    });

    // ========================================
    // Test 7: Cleanup - Delete Test Data
    // ========================================
    await test('Cleanup: Delete Tenant A test data', async () => {
        await api(`/api/candidates/${tenantACandidateId}`, {
            method: 'DELETE',
            headers: { 'X-Tenant-Id': 'customer-a' }
        });

        await api(`/api/jobs/${tenantAJobId}`, {
            method: 'DELETE',
            headers: { 'X-Tenant-Id': 'customer-a' }
        });
    });

    await test('Cleanup: Delete Tenant B test data', async () => {
        await api(`/api/candidates/${tenantBCandidateId}`, {
            method: 'DELETE',
            headers: { 'X-Tenant-Id': 'customer-b' }
        });

        await api(`/api/jobs/${tenantBJobId}`, {
            method: 'DELETE',
            headers: { 'X-Tenant-Id': 'customer-b' }
        });
    });

    // ========================================
    // Test Summary
    // ========================================
    log('\n' + '='.repeat(60), 'blue');
    log('TEST SUMMARY', 'blue');
    log('='.repeat(60), 'blue');
    log(`Total Tests: ${testCount}`, 'yellow');
    log(`Passed: ${passCount}`, 'green');
    log(`Failed: ${failCount}`, failCount > 0 ? 'red' : 'green');

    if (failCount === 0) {
        log('\n✓ ALL TESTS PASSED - Tenant isolation is working correctly!', 'green');
    } else {
        log('\n✗ SOME TESTS FAILED - Please review tenant isolation implementation', 'red');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
