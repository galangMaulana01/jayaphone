// Public entry point for the icon module.
//
// Consumers should almost always import from here, not from `library.ts`
// directly — this keeps the migration path open in case the underlying
// storage changes (e.g. moving to per-icon React components later).

export * from "./library";
export { Icon } from "./Icon";
