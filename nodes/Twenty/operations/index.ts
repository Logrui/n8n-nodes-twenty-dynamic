/**
 * Operations Module
 * 
 * Each operation is responsible for building its GraphQL query/mutation
 * using introspection to discover all available fields including complex types.
 */

export { buildGetQuery } from './get.operation';
export { buildListQuery } from './list.operation';
export { buildCreateMutation } from './create.operation';
export { buildUpdateMutation } from './update.operation';
export { buildDeleteMutation } from './delete.operation';
export { executeUpsert } from './upsert.operation';

// Bulk operations
export { executeCreateMany } from './createMany.operation';
export { executeGetMany } from './getMany.operation';
export { executeUpdateMany } from './updateMany.operation';
export { executeDeleteMany } from './deleteMany.operation';
export { executeUpsertMany } from './upsertMany.operation';
