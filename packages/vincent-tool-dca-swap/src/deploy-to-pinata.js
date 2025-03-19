import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set the Pinata JWT from the environment variable
const PINATA_JWT = process.env.PINATA_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlMmNlNjRmZi05OWJmLTQwNzgtYWUyZi1jMzdhY2Y0MjQxYmUiLCJlbWFpbCI6Ind5YXR0QGxpdHByb3RvY29sLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJlYjY3MTYwNzc0YThjMmQ2OTllYyIsInNjb3BlZEtleVNlY3JldCI6IjUwMjc5ZjFmM2EyZTA3NWQxMThjNDYyZmQ0NmI2YjQyMjU4YjEwZDI4MjEyNzllMGQ2YzhkNDU5MTRhZTk0MmYiLCJleHAiOjE3NjM3ODUyMTN9.QIaybS0zHX_Wh_7Mas3d2QQCcfpQMgURrYAQpjcUC74';

// Paths to the Lit Action files
const toolPath = path.resolve(__dirname, 'lib/lit-action/tool.js');
const policyPath = path.resolve(__dirname, 'lib/lit-action/policy.js');
const policySchemaPath = path.resolve(__dirname, 'lib/lit-action/policy-schema.js');

// Read the Lit Action files
const toolCode = fs.readFileSync(toolPath, 'utf8');
const policyCode = fs.readFileSync(policyPath, 'utf8');
const policySchemaCode = fs.readFileSync(policySchemaPath, 'utf8');

console.log('Tool code loaded, size:', toolCode.length);
console.log('Policy code loaded, size:', policyCode.length);
console.log('Policy Schema code loaded, size:', policySchemaCode.length);

// Function to upload content to Pinata
async function uploadToPinata(content, name) {
  try {
    console.log(`Uploading ${name} to Pinata...`);
    
    // Convert content to Buffer for raw file upload
    const contentBuffer = Buffer.from(content);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', contentBuffer, {
      filename: `${name.toLowerCase()}.js`,
      contentType: 'application/javascript',
    });
    
    formData.append('pinataMetadata', JSON.stringify({
      name: `vincent-dca-${name.toLowerCase()}-${Date.now()}`
    }));
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          ...formData.getHeaders()
        }
      }
    );
    
    console.log(`${name} uploaded successfully!`);
    console.log(`IPFS Hash: ${response.data.IpfsHash}`);
    
    return response.data.IpfsHash;
  } catch (error) {
    console.error(`Error uploading ${name} to Pinata:`, error.response?.data || error.message);
    throw error;
  }
}

async function deployToIPFS() {
  try {
    // Upload the tool code
    const toolIpfsHash = await uploadToPinata(toolCode, 'Tool');
    
    // Upload the policy code
    const policyIpfsHash = await uploadToPinata(policyCode, 'Policy');
    
    // Upload the policy schema code
    const policySchemaIpfsHash = await uploadToPinata(policySchemaCode, 'Policy Schema');
    
    // Write the IPFS hashes to a file
    const ipfsIdsFile = path.resolve(__dirname, '../ipfs-ids.json');
    fs.writeFileSync(ipfsIdsFile, JSON.stringify({
      toolIpfsId: toolIpfsHash,
      policyIpfsId: policyIpfsHash,
      policySchemaIpfsId: policySchemaIpfsHash,
      deployedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`IPFS hashes saved to ${ipfsIdsFile}`);
    
    // Print instructions for using the IPFS hashes
    console.log('\nTo use these Lit Actions, add the following environment variables to your .env file:');
    console.log(`DCA_TOOL_IPFS_ID=${toolIpfsHash}`);
    console.log(`DCA_POLICY_IPFS_ID=${policyIpfsHash}`);
    console.log(`DCA_POLICY_SCHEMA_IPFS_ID=${policySchemaIpfsHash}`);
    
    return {
      toolIpfsId: toolIpfsHash,
      policyIpfsId: policyIpfsHash,
      policySchemaIpfsId: policySchemaIpfsHash
    };
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

// Run the deployment
deployToIPFS().catch(console.error);
