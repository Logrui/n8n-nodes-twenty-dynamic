/**
 * Test to verify the correct ilike filter syntax
 */

const fs = require('fs');
const path = require('path');

function loadEnv() {
    const envPath = path.join(__dirname, 'tests', '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                envVars[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return envVars;
}

const env = loadEnv();
const CONFIG = {
    domain: env.TWENTY_URL?.replace(/\/$/, ''),
    apiKey: env.TWENTY_API_KEY,
};

async function testIlikeFilter() {
    console.log('\n🔍 Testing "ilike" Filter (case-insensitive partial match)\n');

    const tests = [
        { search: 'Siren', expected: 'Should find "Siren"' },
        { search: 'siren', expected: 'Should find "Siren" (case-insensitive)' },
        { search: 'Mona', expected: 'Should find "Monadical" (partial match)' },
        { search: 'mon', expected: 'Should find "Monadical" (partial match)' },
        { search: '', expected: 'Should return all records' },
    ];

    for (const test of tests) {
        console.log('='.repeat(80));
        console.log(`Search: "${test.search}"`);
        console.log(`Expected: ${test.expected}`);
        console.log('─'.repeat(80));

        const query = `
            query SearchCompanies($limit: Int!, $searchPattern: String!) {
                companies(first: $limit, filter: { name: { ilike: $searchPattern } }) {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
        `;

        // For ilike, we need to add % wildcards for partial matching
        const searchPattern = test.search === '' ? '%' : `%${test.search}%`;

        try {
            const response = await fetch(`${CONFIG.domain}/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.apiKey}`,
                },
                body: JSON.stringify({
                    query,
                    variables: { limit: 10, searchPattern },
                }),
            });

            const result = await response.json();

            if (result.errors) {
                console.log('❌ FAILED:', result.errors.map(e => e.message).join(', '));
            } else {
                const edges = result.data.companies.edges;
                console.log(`✅ SUCCESS - Found ${edges.length} results`);
                if (edges.length > 0 && edges.length <= 5) {
                    edges.forEach((edge, i) => {
                        console.log(`   ${i + 1}. ${edge.node.name}`);
                    });
                } else if (edges.length > 5) {
                    edges.slice(0, 3).forEach((edge, i) => {
                        console.log(`   ${i + 1}. ${edge.node.name}`);
                    });
                    console.log(`   ... and ${edges.length - 3} more`);
                }
            }
        } catch (error) {
            console.log('❌ ERROR:', error.message);
        }
        console.log('');
    }

    console.log('='.repeat(80));
    console.log('📊 RECOMMENDATION');
    console.log('='.repeat(80));
    console.log(`
✅ Use "ilike" filter with "%" wildcards for search
   
Filter syntax:
    filter: { name: { ilike: $searchPattern } }
    
Where searchPattern is:
    - Empty search: "%" (matches all)
    - User types "Siren": "%Siren%"
    - User types "mona": "%mona%" (case-insensitive)
    
This provides the best user experience:
    ✅ Case-insensitive
    ✅ Partial matching (finds "Monadical" when typing "mona")
    ✅ Works with empty search
`);
}

testIlikeFilter().catch(console.error);
