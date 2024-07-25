const {
    StorageSharedKeyCredential,
    ContainerSASPermissions,
    generateBlobSASQueryParameters
} = require("@azure/storage-blob");
const { extractConnectionStringParts } = require('./utils.js');

    module.exports = async function (context, req) {
    const permissions = 'c';
    const container = 'images';
    context.res = {
        body: generateSasToken(process.env.AzureWebJobsStorage, container, permissions)
    };
    context.done();
};
// Function takes your Azure Blob Storage connection string, a container name, and a permissions string, and uses them to build the SAS token.
function generateSasToken(connectionString, container, permissions) {
    const { accountKey, accountName, url } = extractConnectionStringParts(connectionString);
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey.toString('base64'));

    var expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 2);

    const sasKey = generateBlobSASQueryParameters({
        containerName: container,
        permissions: ContainerSASPermissions.parse(permissions),
        expiresOn: expiryDate,
    }, sharedKeyCredential);

    return {
        sasKey: sasKey.toString(),
        url: url
    };
}

