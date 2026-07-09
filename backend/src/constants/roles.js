/**
 * Role constants — single source of truth for all user roles.
 * Use these instead of hardcoding strings like 'ADMIN' or 'AGENT'.
 */
const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
});

module.exports = { ROLES };
