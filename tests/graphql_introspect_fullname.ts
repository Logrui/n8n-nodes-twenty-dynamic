/**
 * Introspect FullName type to understand its structure
 */

import * as dotenv from 'dotenv';

dotenv.config();

const TWENTY_API_KEY = process.env.TWENTY_API_KEY;
const TWENTY_URL = process.env.TWENTY_URL;

async function introspectFullName() {
    const query = `
        query IntrospectFullName {
            __type(name: "FullName") {
                name
                kind
                description
                fields {
                    name
                    description
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                }
            }
        }
    `;

    const baseUrl = TWENTY_URL!.endsWith('/') ? TWENTY_URL!.slice(0, -1) : TWENTY_URL;

    console.log('═══════════════════════════════════════════════════════');
    console.log('  Introspecting FullName Type');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });

    const result = await response.json() as any;

    if (result.data?.__type) {
        const type = result.data.__type;
        console.log(`📋 Type: ${type.name} (${type.kind})`);
        if (type.description) {
            console.log(`Description: ${type.description}`);
        }
        console.log('');

        if (type.fields) {
            console.log('Fields:');
            type.fields.forEach((field: any) => {
                const typeName = field.type.ofType?.name || field.type.name;
                const typeKind = field.type.kind;
                const required = typeKind === 'NON_NULL' ? '(required)' : '(optional)';
                console.log(`  - ${field.name}: ${typeName} ${required}`);
                if (field.description) {
                    console.log(`    Description: ${field.description}`);
                }
            });
        }
    }

    // Also check FullNameCreateInput
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Introspecting FullNameCreateInput Type');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const inputQuery = `
        query IntrospectFullNameInput {
            __type(name: "FullNameCreateInput") {
                name
                kind
                description
                inputFields {
                    name
                    description
                    type {
                        name
                        kind
                        ofType {
                            name
                            kind
                        }
                    }
                }
            }
        }
    `;

    const inputResponse = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TWENTY_API_KEY}`,
        },
        body: JSON.stringify({ query: inputQuery }),
    });

    const inputResult = await inputResponse.json() as any;

    if (inputResult.data?.__type) {
        const type = inputResult.data.__type;
        console.log(`📋 Type: ${type.name} (${type.kind})`);
        if (type.description) {
            console.log(`Description: ${type.description}`);
        }
        console.log('');

        if (type.inputFields) {
            console.log('Input Fields:');
            type.inputFields.forEach((field: any) => {
                const typeName = field.type.ofType?.name || field.type.name;
                const typeKind = field.type.kind;
                const required = typeKind === 'NON_NULL' ? '(required)' : '(optional)';
                console.log(`  - ${field.name}: ${typeName} ${required}`);
                if (field.description) {
                    console.log(`    Description: ${field.description}`);
                }
            });
        }
    }

    // Check other common input types
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Checking Other Complex Input Types');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const complexTypes = ['LinksCreateInput', 'AddressCreateInput', 'CurrencyCreateInput', 'ActorCreateInput'];

    for (const typeName of complexTypes) {
        const typeQuery = `
            query IntrospectType {
                __type(name: "${typeName}") {
                    name
                    kind
                    inputFields {
                        name
                        type {
                            name
                            kind
                            ofType {
                                name
                                kind
                            }
                        }
                    }
                }
            }
        `;

        const typeResponse = await fetch(`${baseUrl}/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TWENTY_API_KEY}`,
            },
            body: JSON.stringify({ query: typeQuery }),
        });

        const typeResult = await typeResponse.json() as any;

        if (typeResult.data?.__type) {
            const type = typeResult.data.__type;
            console.log(`\n📦 ${type.name}:`);
            if (type.inputFields) {
                type.inputFields.forEach((field: any) => {
                    const typeName = field.type.ofType?.name || field.type.name;
                    const typeKind = field.type.kind;
                    const required = typeKind === 'NON_NULL' ? '(required)' : '(optional)';
                    console.log(`  - ${field.name}: ${typeName} ${required}`);
                });
            }
        } else {
            console.log(`\n⚠️  ${typeName} not found`);
        }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Introspection Complete');
    console.log('═══════════════════════════════════════════════════════');
}

introspectFullName().catch(console.error);
