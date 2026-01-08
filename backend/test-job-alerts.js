// Test script to check if Job Alerts N8N webhook is working

const fetch = require('node-fetch');

async function testJobAlertsAPI() {
    const url = 'https://n8n-production-3f14.up.railway.app/webhook/bc4a44fa-2a16-4108-acb1-34c2353e9476';

    console.log('Testing Job Alerts API...');
    console.log('URL:', url);
    console.log('');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers));
        console.log('');

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('Response Data (JSON):');
            console.log(JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log('Response Data (Text):');
            console.log(text);
        }

        console.log('');
        console.log('✓ API is accessible');

        // Check if data is in expected format
        if (data && (data.alerts || data.results)) {
            console.log('✓ Data format looks correct');
            console.log('  - alerts:', data.alerts?.length || 0);
            console.log('  - results:', data.results?.length || 0);
        } else {
            console.log('⚠️  Data format might be unexpected');
            console.log('   Expected: { alerts: [...] } or { results: [...] }');
        }

    } catch (err) {
        console.error('✗ API Test Failed:');
        console.error('  Error:', err.message);
        console.error('  Type:', err.constructor.name);
    }
}

testJobAlertsAPI();
