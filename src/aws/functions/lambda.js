const { LambdaClient, AddPermissionCommand, RemovePermissionCommand } = require("@aws-sdk/client-lambda");


const config = {
  region: 'ap-south-1',
};
const lambdaObj = new LambdaClient(config);


const lambdaAddPerm = async (addPermissionParams) => {
    try {

        const addPermissionCommand = new AddPermissionCommand(addPermissionParams);
        await lambdaObj.send(addPermissionCommand);
        return true;
    } catch (e) {
        console.error(e);
        throw new Error('Failed to put rule to AWS EventBridge');
    }
};

const lambdaRemovePerm = async (prams) => {
    try {
      await lambdaObj.send(new RemovePermissionCommand(prams));
      return true;
    } catch (err) {
      console.error("Error", err);
      throw new Error('Failed to remove rule to AWS EventBridge');
    }
  };

module.exports = { lambdaAddPerm, lambdaRemovePerm };
