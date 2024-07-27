# Photo Sharing Application with Azure Blob Storage

## Overview
This guide will walk you through setting up a secure image upload system using Azure Blob Storage, Azure Functions, and other necessary configurations.

### Key Steps
1. **Create your Azure Blob Storage**: Store images uploaded by users.
2. **Create an Azure Function that serves as the REST API**: Generate SAS tokens on demand and handle user requests securely.
3. **Create the Image Upload Frontend**: Create a frontend form that uses the Azure Functions REST API to securely upload images to your storage

- Fast and reliable file serving
- Secure image uploading
- Serverless backend for generating Shared Access Signatures (SAS)
- Organized storage using containers
- Cross-Origin Resource Sharing (CORS) setup


## Azure Resources
1. **Azure Blob Storage**: Store images uploaded by users.
3. **Azure Functions**: Generate SAS tokens on demand and handle user requests securely.
4. **CORS Configuration**: Enable cross-origin requests from your frontend to Azure Blob Storage.

## Step-by-Step Guide

### 1. Create your Azure Blob Storage
#### 1.1 Create Your Azure Storage Account
1. Sign in to the [Azure Portal](https://portal.azure.com/).
2. Create a new Storage Account.
3. Note down the Storage Account name and key.

### 1.2 Create a New Storage Container
1. Navigate to your Storage Account in the Azure Portal.
2. Under the "Data Storage" section, select "Containers".
3. Create a new container named it `images`.

#### 1.3 Set Up CORS
1. In your Storage Account, go to the "Settings" section and select "CORS".
2. Add a new CORS rule with the following settings:
   - Allowed origins: Your domain (e.g., `https://yourdomain.com`)
   - Allowed methods: `PUT`
   - Allowed headers: `*`
   - Exposed headers: `*`
   - Max age: `3600`
 

### 2. Create an Azure Function that serves as the REST API

#### 2.1. Create an Azure Function App
1. In the VSCode, under the Azure extension:
    - Click Azure Function icon then on "Create New Project"
    - Select your project's folder
    - Select JavaScript for language
    - Model V3
    - Httptrigger, then name it "credentials"
    - "Anonymous" for auth level

#### 2.2 Generating shared access signatures
1. Open the index.js file from your "credentials" folder and add the following function at the bottom:
```javascript
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
```
2. Create a file inside the "credentials" folder and call it utils.js
```javascript
/**
 * Extracts account name from the url
 * @param {string} url url to extract the account name from
 * @returns {string} with the account name
 */
function getAccountNameFromUrl(url) {
    var parsedUrl = URLBuilder.parse(url);
    var accountName;
    try {
        if (parsedUrl.getHost().split(".")[1] === "blob") {
            // `${defaultEndpointsProtocol}://${accountName}.blob.${endpointSuffix}`;
            accountName = parsedUrl.getHost().split(".")[0];
        }
        else {
            // IPv4/IPv6 address hosts... Example - http://192.0.0.10:10001/devstoreaccount1/
            // Single word domain without a [dot] in the endpoint... Example - http://localhost:10001/devstoreaccount1/
            // .getPath() -> /devstoreaccount1/
            accountName = parsedUrl.getPath().split("/")[1];
        }
        if (!accountName) {
            throw new Error("Provided accountName is invalid.");
        }
        return accountName;
    }
    catch (error) {
        throw new Error("Unable to extract accountName with provided information.");
    }
}
function getProxyUriFromDevConnString(connectionString) {
    // Development Connection String
    // https://docs.microsoft.com/en-us/azure/storage/common/storage-configure-connection-string#connect-to-the-emulator-account-using-the-well-known-account-name-and-key
    var proxyUri = "";
    if (connectionString.search("DevelopmentStorageProxyUri=") !== -1) {
        // CONNECTION_STRING=UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://myProxyUri
        var matchCredentials = connectionString.split(";");
        for (var _i = 0, matchCredentials_1 = matchCredentials; _i < matchCredentials_1.length; _i++) {
            var element = matchCredentials_1[_i];
            if (element.trim().startsWith("DevelopmentStorageProxyUri=")) {
                proxyUri = element.trim().match("DevelopmentStorageProxyUri=(.*)")[1];
            }
        }
    }
    return proxyUri;
}
function getValueInConnString(connectionString, argument) {
    var elements = connectionString.split(";");
    for (var _i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
        var element = elements_1[_i];
        if (element.trim().startsWith(argument)) {
            return element.trim().match(argument + "=(.*)")[1];
        }
    }
    return "";
}
/**
 * Extracts the parts of an Azure Storage account connection string.
 *
 * @export
 * @param {string} connectionString Connection string.
 * @returns {ConnectionString}  String key value pairs of the storage account's url and credentials.
 */
function extractConnectionStringParts(connectionString) {
    var proxyUri = "";
    if (connectionString.startsWith("UseDevelopmentStorage=true")) {
        // Development connection string
        proxyUri = getProxyUriFromDevConnString(connectionString);
        connectionString = DevelopmentConnectionString;
    }
    // Matching BlobEndpoint in the Account connection string
    var blobEndpoint = getValueInConnString(connectionString, "BlobEndpoint");
    // Slicing off '/' at the end if exists
    // (The methods that use `extractConnectionStringParts` expect the url to not have `/` at the end)
    blobEndpoint = blobEndpoint.endsWith("/") ? blobEndpoint.slice(0, -1) : blobEndpoint;
    if (connectionString.search("DefaultEndpointsProtocol=") !== -1 &&
        connectionString.search("AccountKey=") !== -1) {
        // Account connection string
        var defaultEndpointsProtocol = "";
        var accountName = "";
        var accountKey = Buffer.from("accountKey", "base64");
        var endpointSuffix = "";
        // Get account name and key
        accountName = getValueInConnString(connectionString, "AccountName");
        accountKey = Buffer.from(getValueInConnString(connectionString, "AccountKey"), "base64");
        if (!blobEndpoint) {
            // BlobEndpoint is not present in the Account connection string
            // Can be obtained from `${defaultEndpointsProtocol}://${accountName}.blob.${endpointSuffix}`
            defaultEndpointsProtocol = getValueInConnString(connectionString, "DefaultEndpointsProtocol");
            var protocol = defaultEndpointsProtocol.toLowerCase();
            if (protocol !== "https" && protocol !== "http") {
                throw new Error("Invalid DefaultEndpointsProtocol in the provided Connection String. Expecting 'https' or 'http'");
            }
            endpointSuffix = getValueInConnString(connectionString, "EndpointSuffix");
            if (!endpointSuffix) {
                throw new Error("Invalid EndpointSuffix in the provided Connection String");
            }
            blobEndpoint = defaultEndpointsProtocol + "://" + accountName + ".blob." + endpointSuffix;
        }
        if (!accountName) {
            throw new Error("Invalid AccountName in the provided Connection String");
        }
        else if (accountKey.length === 0) {
            throw new Error("Invalid AccountKey in the provided Connection String");
        }
        return {
            kind: "AccountConnString",
            url: blobEndpoint,
            accountName: accountName,
            accountKey: accountKey,
            proxyUri: proxyUri
        };
    }
    else {
        // SAS connection string
        var accountSas = getValueInConnString(connectionString, "SharedAccessSignature");
        var accountName = getAccountNameFromUrl(blobEndpoint);
        if (!blobEndpoint) {
            throw new Error("Invalid BlobEndpoint in the provided SAS Connection String");
        }
        else if (!accountSas) {
            throw new Error("Invalid SharedAccessSignature in the provided SAS Connection String");
        }
        else if (!accountName) {
            throw new Error("Invalid AccountName in the provided SAS Connection String");
        }
        return { kind: "SASConnString", url: blobEndpoint, accountName: accountName, accountSas: accountSas };
    }
}

module.exports = {
    extractConnectionStringParts: extractConnectionStringParts
}
```
3.Under the credentials folder in the index.js file your code should look like this:
```javascript
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
```
### 3. Create the Image Upload Frontend
3.1 Create an index.html file in the root folder and add the following code to it:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Azure Blob Storage Image Upload</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.0/css/bulma.min.css">
  </head>
  <body>
  <section class="section">
    <div class="container">
      <h1 class="title">Loading SASKey from the API: </h1>
      <pre id="name">...</pre>
      <br>
      <label for="image">Choose a profile picture:</label>
      <input type="file" id="image" name="image" accept="image/png, image/jpeg">
    </div>
  </section>
  <script src="./dist/main.js" type="text/javascript"></script>
    <script>
        (async function () {
            const {url, sasKey} = (await fetch("/api/credentials")).json();
            document.querySelector('#name').textContent = `SAS Key: ${sasKey}` + "\n" + `URL: ${url}`;
            function uploadFile() {
                const file = document.getElementById('image').files[0];
                blobUpload(file, url, 'images', sasKey);
            };
            const fileInput = document.getElementById('image');
            fileInput.addEventListener("change", uploadFile);
        }())
    </script>
  </body>
</html>
```
3.2 Create a src folder and add an index.js file and copy this code:
```javascript
 const { BlockBlobClient, AnonymousCredential } = require("@azure/storage-blob");

blobUpload = function(file, url, container, sasKey) {
    var blobName = buildBlobName(file);
    var login = `${url}/${container}/${blobName}?${sasKey}`;
    var blockBlobClient = new BlockBlobClient(login, new AnonymousCredential());
    blockBlobClient.uploadBrowserData(file);
}

function buildBlobName(file) {
    var filename = file.name.substring(0, file.name.lastIndexOf('.'));
    var ext = file.name.substring(file.name.lastIndexOf('.'));
    return filename + '_' + Math.random().toString(16).slice(2) + ext;
}
```
3.3 Use the Azure Blob Storage SDK with Webpack
    1. Install Webpack by running the following commands in your project's root folder:

    npm install webpack --save-dev
    npm install webpack-cli --save-dev

3.4 Edit your package.json file and add "build": "webpack --mode=development" to the scripts key, so it matches the following code:
```json
"scripts": {
    "start": "func start",
    "test": "echo \"No tests yet...\"",
    "build": "webpack --mode=development"
  }
```
3.5 Run webpack by entering the following command in your terminal:

    npm run build

### Run Your Project Locally

Now, it's time to test your project locally.

1. In Visual Studio Code, press `F5` to start the Azure Functions project in debug mode.
2. Wait until VS Code has launched your project. You'll see a URL like the following in the console. Copy it and open it in your browser:

```bash
http://localhost:7071/api/credentials
```
### Test Your Project Using Live Server

Now, let's run the frontend side of the project. To accomplish this, we'll use Live Server.

Configure Live Server so it forwards calls to your credentials API to the Azure Functions backend running on your machine. Add the following configuration key into your `.vscode/settings.json` file.

```json
{
    "liveServer.settings.proxy": {
        "enable": true,
        "baseUri": "/api",
        "proxyUri": "http://127.0.0.1:7071/api"
    }
}







