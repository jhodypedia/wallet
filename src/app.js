const express = require('express');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Infura API key from environment variables
const infuraAPIKey = process.env.INFURA_API_KEY;  // Infura API Key

// Supported networks
const networks = {
    '1': 'mainnet',
    '3': 'ropsten',
    '4': 'rinkeby',
    '5': 'goerli',
    '42': 'kovan'
};

// Connect to Infura with the right network based on user input
function getWeb3Provider(networkId) {
    const networkName = networks[networkId] || 'mainnet'; // Default to mainnet if networkId not found
    const infuraURL = `https://${networkName}.infura.io/v3/${infuraAPIKey}`;
    return new Web3(new Web3.providers.HttpProvider(infuraURL));
}

// Handle POST request for sending transaction
app.post('/sendTransaction', async (req, res) => {
    const { fromAddress, toAddress, amount, signature } = req.body;

    try {
        const web3 = getWeb3Provider(req.body.networkId || '1'); // Default to Mainnet
        const message = `Send ${amount} ETH to ${toAddress}`;

        // Verify the signature
        const recoveredAddress = web3.eth.accounts.recover(message, signature);

        if (recoveredAddress.toLowerCase() !== fromAddress.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Signature does not match the sender address' });
        }

        // Convert amount to Wei (Ethereum transactions are done in Wei, not Ether)
        const amountInWei = web3.utils.toWei(amount, 'ether');

        const tx = {
            from: fromAddress,
            to: toAddress,
            value: amountInWei,
            gas: 21000, // Standard gas for ETH transfer
            gasPrice: await web3.eth.getGasPrice(),
            nonce: await web3.eth.getTransactionCount(fromAddress),
        };

        // Send the signed transaction
        const receipt = await web3.eth.sendTransaction(tx);

        res.json({
            success: true,
            txHash: receipt.transactionHash
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Transaction failed',
            error: error.message,
        });
    }
});

// Root endpoint to serve the index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
