const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

const TWENTY_API_URL = process.env.TWENTY_API_URL || 'http://localhost:3000';
const TWENTY_API_KEY = process.env.TWENTY_API_KEY;

const baseUrl = TWENTY_API_URL.replace(/\/+$/, '').replace(/\/graphql$/, '');
const metadataUrl = `${baseUrl}/metadata`;

async function checkCategoryField() {
    console.log('🔍 Checking for company.category field...\n');
    
    // Query metadata API
    const query = `
        query {
            objects(paging: {first: 100}) {
                edges {
                    node {
                        nameSingular
                        labelSingular
                        fields(paging: {first: 100}) {
                            edges {
                                node {
                                    name
                                    label
                                    type
                                    options
                                }
                            }
                        }
                    }
                }
            }
        }
    `;
    
    const response = await fetch(metadataUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });
    
    const result = await response.json();
    
    if (result.errors) {
        console.error('Errors:', result.errors);
        return;
    }
    
    const company = result.data.objects.edges.find(e => e.node.nameSingular === 'company');
    
    if (!company) {
        console.error('❌ Company object not found');
        return;
    }
    
    console.log(`✅ Company object found: ${company.node.labelSingular}\n`);
    
    // Look for category field
    const categoryField = company.node.fields.edges.find(e => e.node.name === 'category');
    
    if (categoryField) {
        console.log('✅ category field FOUND in metadata API!');
        console.log(JSON.stringify(categoryField.node, null, 2));
    } else {
        console.log('❌ category field NOT FOUND in metadata API');
        console.log('\nAll company fields:');
        company.node.fields.edges.forEach(e => {
            console.log(`  - ${e.node.name} (${e.node.type})`);
        });
        
        console.log('\n🔍 Looking for fields containing "category":');
        const categoryLike = company.node.fields.edges.filter(e => 
            e.node.name.toLowerCase().includes('categ') || 
            e.node.label.toLowerCase().includes('categ')
        );
        
        if (categoryLike.length > 0) {
            console.log('Found similar fields:');
            categoryLike.forEach(e => console.log(JSON.stringify(e.node, null, 2)));
        } else {
            console.log('No fields matching "category" pattern');
        }
    }
}

checkCategoryField().catch(console.error);
