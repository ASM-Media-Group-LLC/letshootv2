// /success is the primary route for the case-study / content library page.
// It re-exports the exact same component used by /biblioteca so both routes
// always stay in sync (single source of truth). /biblioteca is kept alive as
// a legacy alias for links already shared.
export { default } from '../biblioteca/page';
