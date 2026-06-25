const { EventBridgeClient, PutRuleCommand, PutTargetsCommand, ListRulesCommand, RemoveTargetsCommand, DeleteRuleCommand } = require('@aws-sdk/client-eventbridge');
const config = {
  region: 'ap-south-1',
};

// console.log(config)

const ebObj = new EventBridgeClient(config);


/**
 * Puts a rule to AWS EventBridge.
 *
 * @param {string} ruleName - The name of the rule.
 * @param {Object} params - The parameters for the rule.
 /**
 * Puts a rule to AWS EventBridge.
 *
 * @param {Object} params - The parameters for the rule.
 * @returns {Promise<string>} The ARN of the rule if successful.
 * @throws {Error} If there is an error with AWS EventBridge.
 */

const eventBridgePutRule = async (params) => {
    try {
        const command = new PutRuleCommand(params);
        const putRuleResponse = await ebObj.send(command);
        if (putRuleResponse.RuleArn) {
            return putRuleResponse.RuleArn;
        } else {
            throw new Error('Failed to get RuleArn from AWS EventBridge');
        }
    } catch (e) {
        console.error(e);
        throw new Error('Failed to put rule to AWS EventBridge');
    }
};

/**
 * Puts a target to AWS EventBridge.
 *
 * @param {Object} params - The parameters for the target.
 * @returns {Promise<boolean>} Returns true if successful.
 * @throws {Error} If there is an error with AWS EventBridge.
 */
const putTarget = async (params) => {
    try {
        const putTargetsCommand = new PutTargetsCommand(params);
        await ebObj.send(putTargetsCommand);
        return true;
    } catch (e) {
        console.error(e);
        throw new Error('Failed to put target to AWS EventBridge');
    }
};


const listRules = async (ruleName) => {
    try {
        const listRuleCommand = new ListRulesCommand({ NamePrefix: ruleName });
        const data = await ebObj.send(listRuleCommand);
        return data.Rules && data.Rules.length ? data.Rules : []
    } catch (err) {
        console.error("Error", err);
    }
};

const removePermissionAndDeleteRule = async (ruleName, targetID) => {
    try {
        // Remove targets
        const removeTargetsData = await ebObj.send(new RemoveTargetsCommand({ Rule: ruleName, Ids: [targetID] }));
        console.log("Targets removed", removeTargetsData);

        // Delete rule
        const deleteRuleData = await ebObj.send(new DeleteRuleCommand({ Name: ruleName }));
        console.log("Rule deleted", deleteRuleData);
        return true;
    } catch (err) {
        console.error("Error", err);
        throw err;
    }
};

module.exports = { eventBridgePutRule, putTarget, listRules, removePermissionAndDeleteRule };
