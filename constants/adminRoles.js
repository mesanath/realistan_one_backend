'use strict';

// ─── Admin Roles ────────────────────────────────────────────────────────────
// Two products (realistan, serveease), each with 3 role tiers. An admin user
// can hold a role in either product independently (e.g. realistan:operations
// + serveease:customer_services_management), or no role in one of them.
//
//   admin                        — full access, including creating admin
//                                   console users (realistan only — ServeEase
//                                   has no admin-console-user concept of its
//                                   own, so 'admin' and 'operations' carry the
//                                   same ServeEase access; see serveease's
//                                   admin.routes.js).
//   operations                   — everything 'admin' has, except creating
//                                   admin console users (realistan only).
//   customer_services_management — read access for context, write access
//                                   restricted to "reply / update status"
//                                   actions only:
//                                     realistan  -> lease & loan inquiry status
//                                     serveease  -> dispute reply/resolve,
//                                                   booking status update
const REALISTAN_ROLES = ['admin', 'operations', 'customer_services_management'];
const SERVEEASE_ROLES = ['admin', 'operations', 'customer_services_management'];

// realistan-admin routes are gated by admin-auth.middleware's
// requireAccess(level, type), which checks these readAccess/writeAccess
// arrays — access levels in use:
//   Articles           - properties, articles, banners, homepage categories
//   User               - general read + user/profile/pincode management
//   Inquiries          - lease & loan inquiry read + create/delete (full
//                        inquiry management, not just status)
//   InquiryStatus      - lease & loan inquiry status update only — the
//                        realistan "reply / update status" surface, granted
//                        to customer_services_management as well
//   AdminConsoleUsers  - creating/editing/deleting admin console users
//   PropertyVerification - review property verification requests (approve/reject uploaded
//                        title deed/encumbrance certificate/RERA/tax receipt/litigation search
//                        documents); customer_services_management gets read-only so support staff
//                        can see status without being able to approve/reject themselves.
const REALISTAN_ACCESS_BY_ROLE = {
    admin: {
        readAccess: ['Articles', 'User', 'Inquiries', 'InquiryStatus', 'AdminConsoleUsers', 'PropertyVerification'],
        writeAccess: ['Articles', 'User', 'Inquiries', 'InquiryStatus', 'AdminConsoleUsers', 'PropertyVerification'],
    },
    operations: {
        readAccess: ['Articles', 'User', 'Inquiries', 'InquiryStatus', 'PropertyVerification'],
        writeAccess: ['Articles', 'User', 'Inquiries', 'InquiryStatus', 'PropertyVerification'],
    },
    customer_services_management: {
        readAccess: ['Articles', 'User', 'Inquiries', 'PropertyVerification'],
        writeAccess: ['InquiryStatus'],
    },
};

const getRealistanAccess = (role) =>
    REALISTAN_ACCESS_BY_ROLE[role] || { readAccess: [], writeAccess: [] };

module.exports = {
    REALISTAN_ROLES,
    SERVEEASE_ROLES,
    REALISTAN_ACCESS_BY_ROLE,
    getRealistanAccess,
};
