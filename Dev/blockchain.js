const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];
const uuid = require('uuid/v1');

function Blockchain() {
    this.chain = [];
    this.pendingTransactions = [];
    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];
    this.createNewBlock(100, '0', '0');
};


Blockchain.prototype.createNewBlock = function (nonce, previousBlockHasch, hash) {
    const newBlock = {
        index: this.chain.length + 1,
        timestamp: Date.now(),
        transactions: this.pendingTransactions,
        nonce: nonce,
        hash: hash,
        prevBlockHasch: previousBlockHasch,
    };
    this.pendingTransactions = [];
    this.chain.push(newBlock);

    return newBlock;
};

Blockchain.prototype.getLastBlock = function () {
    return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = function (amount, sender, recipient) {
    const newTranction = {
        amount: amount,
        sender: sender,
        recipient: recipient,
        transactionId: uuid().split('-').join('')
    };
    return newTranction;
};

Blockchain.prototype.addTransactionToPendingTransactions = function (transactionObj) {
    this.pendingTransactions.push(transactionObj);
    return this.getLastBlock()['index'] + 1;
};

Blockchain.prototype.hashBlock = function (previousBlockHasch, currentBlockData, nonce) {
    const dataAsString = previousBlockHasch + nonce.toString() + JSON.stringify(currentBlockData);
    const hash = sha256(dataAsString);
    return hash;
};

Blockchain.prototype.proofOfWork = function (previousBlockHasch, currentBlockData) {
    let nonce = 0;
    let hash = this.hashBlock(previousBlockHasch, currentBlockData, nonce);
    while (hash.substring(0, 4) !== '0000') {
        nonce++;
        hash = this.hashBlock(previousBlockHasch, currentBlockData, nonce);
    }
    return nonce;
};


module.exports = Blockchain;