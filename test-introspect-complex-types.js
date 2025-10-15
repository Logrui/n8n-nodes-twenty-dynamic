/**
 * Introspect Emails and Phones complex types to see their structure
 */

require('dotenv').config({ path: './tests/.env' });
const https = require('https');

const API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL || 'https://twenty.envisicapital.com/';
const API_URL = new URL(TWENTY_URL).hostname;

function makeGraphQLRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ query, variables });

        const options = {
            hostname: API_URL,
            path: '/graphql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': data.length,
            },
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (response.errors) {
                        reject(new Error(JSON.stringify(response.errors, null, 2)));
                    } else {
                        resolve(response.data);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function introspectType(typeName) {
    console.log(`\n🔍 Introspecting ${typeName} Type`);
    console.log('='.repeat(60));

    const query = `
        query IntrospectType {
            __type(name: "${typeName}") {
                name
                fields {
                    name
                    type {
                        name
                        kind
                    }
                }
            }
        }
    `;

    const data = await makeGraphQLRequest(query);
    
    if (!data.__type) {
        console.log(`❌ Type ${typeName} not found`);
        return;
    }

    console.log(`✅ ${typeName} fields:`);
    data.__type.fields.forEach(field => {
        console.log(`   - ${field.name}: ${field.type.name || field.type.kind}`);
    });
}

async function run() {
    try {
        await introspectType('Emails');
        await introspectType('Phones');
        await introspectType('Company');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

run();
