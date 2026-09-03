'use strict';
const router = require('express').Router();
const { authenticate, requireAccess } = require('../../../src/middleware/admin-auth.middleware');
const validate = require('../../../src/middleware/validate.middleware');
const { getAgentsList, getAgentDetails, addAgent, editAgent, deleteAgent } = require('../controllers/agents.controller');
const { addAgentSchema, editAgentSchema, agentIDParamSchema } = require('../validators/agents.validator');

router.get(
    '/',
    authenticate,
    requireAccess('User', 'read'),
    getAgentsList
);

router.get(
    '/:agentID',
    authenticate,
    requireAccess('User', 'read'),
    validate(agentIDParamSchema, 'params'),
    getAgentDetails
);

router.post(
    '/',
    authenticate,
    requireAccess('User', 'write'),
    validate(addAgentSchema),
    addAgent
);

router.put(
    '/:agentID',
    authenticate,
    requireAccess('User', 'write'),
    validate(agentIDParamSchema, 'params'),
    validate(editAgentSchema),
    editAgent
);

router.delete(
    '/:agentID',
    authenticate,
    requireAccess('User', 'write'),
    validate(agentIDParamSchema, 'params'),
    deleteAgent
);

module.exports = router;
