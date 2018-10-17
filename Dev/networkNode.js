const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const port = process.argv[2];
const rp = require('request-promise');

const nodeAddress = uuid().split('-').join('');

const beblock = new Blockchain();


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));


// GET ENTIRE BLOCKCHAIN //
app.get('/blockchain', function (req, res) {
  res.send(beblock);
});


// CREATE NEW TRANSACTION //
app.post('/transaction', function (req, res) {
  const newTransaction = req.body;
  const blockIndex = beblock
    .addTransactionToPendingTransactions(newTransaction);
  res.json({
    note: `Transaction will be added in block ${blockIndex}.`
  });
});


// BROADCAST TRANSACTION //
app.post('/transaction/broadcast', function (req, res) {
  const newTransaction = beblock
    .createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
  beblock
    .addTransactionToPendingTransactions(newTransaction);

  const requestPromises = [];
  beblock
    .networkNodes.forEach(networkNodeUrl => {
      const requestOptions = {
        uri: networkNodeUrl + '/transaction',
        method: 'POST',
        body: newTransaction,
        json: true
      };

      requestPromises.push(rp(requestOptions));
    });

  Promise.all(requestPromises)
    .then(data => {
      res.json({
        note: 'Transaction created and broadcast successfully.'
      });
    });
});


// MINE A BLOCK //
app.get('/mine', function (req, res) {
  const lastBlock = beblock
    .getLastBlock();
  const previousBlockHash = lastBlock['hash'];
  const currentBlockData = {
    transactions: beblock
      .pendingTransactions,
    index: lastBlock['index'] + 1
  };
  const nonce = beblock.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = beblock.hashBlock(previousBlockHash, currentBlockData, nonce);
  const newBlock = beblock.createNewBlock(nonce, previousBlockHash, blockHash);

  const requestPromises = [];
  beblock.networkNodes.forEach(networkNodeUrl => {
      const requestOptions = {
        uri: networkNodeUrl + '/receive-new-block',
        method: 'POST',
        body: {
          newBlock: newBlock
        },
        json: true
      };

      requestPromises.push(rp(requestOptions));
    });

  Promise.all(requestPromises)
    .then(data => {
      const requestOptions = {
        uri: beblock
          .currentNodeUrl + '/transaction/broadcast',
        method: 'POST',
        body: {
          amount: 12.5,
          sender: "00",
          recipient: nodeAddress
        },
        json: true
      };

      return rp(requestOptions);
    })
    .then(data => {
      res.json({
        note: "New block mined & broadcast successfully",
        block: newBlock
      });
    });
});


// RECEIVE NEW BLOCK //
app.post('/receive-new-block', function (req, res) {
  const newBlock = req.body.newBlock;
  const lastBlock = beblock
    .getLastBlock();
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

  if (correctHash && correctIndex) {
    beblock
      .chain.push(newBlock);
    beblock
      .pendingTransactions = [];
    res.json({
      note: 'New block received and accepted.',
      newBlock: newBlock
    });
  } else {
    res.json({
      note: 'New block rejected.',
      newBlock: newBlock
    });
  }
});

// REGISTER A NODE AND BROADCAST IT//
app.post('/register-and-broadcast-node', function (req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  if (beblock
    .networkNodes.indexOf(newNodeUrl) == -1) beblock
    .networkNodes.push(newNodeUrl);

  const regNodesPromises = [];
  beblock
    .networkNodes.forEach(networkNodeUrl => {
      const requestOptions = {
        uri: networkNodeUrl + '/register-node',
        method: 'POST',
        body: {
          newNodeUrl: newNodeUrl
        },
        json: true
      };

      regNodesPromises.push(rp(requestOptions));
    });

  Promise.all(regNodesPromises)
    .then(data => {
      const bulkRegisterOptions = {
        uri: newNodeUrl + '/register-nodes-bulk',
        method: 'POST',
        body: {
          allNetworkNodes: [...beblock
            .networkNodes, beblock
            .currentNodeUrl
          ]
        },
        json: true
      };

      return rp(bulkRegisterOptions);
    })
    .then(data => {
      res.json({
        note: 'New node registered with network successfully.'
      });
    });
});

// REGISTER A NODE WITH THE NETWORK //
app.post('/register-node', function (req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  const nodeNotAlreadyPresent = beblock
    .networkNodes.indexOf(newNodeUrl) == -1;
  const notCurrentNode = beblock
    .currentNodeUrl !== newNodeUrl;
  if (nodeNotAlreadyPresent && notCurrentNode) beblock
    .networkNodes.push(newNodeUrl);
  res.json({
    note: 'New node registered successfully.'
  });
});

// REGISTER MULTIPLE NODES AT ONCE //
app.post('/register-nodes-bulk', function (req, res) {
  const allNetworkNodes = req.body.allNetworkNodes;
  allNetworkNodes.forEach(networkNodeUrl => {
    const nodeNotAlreadyPresent = beblock
      .networkNodes.indexOf(networkNodeUrl) == -1;
    const notCurrentNode = beblock
      .currentNodeUrl !== networkNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) beblock
      .networkNodes.push(networkNodeUrl);
  });

  res.json({
    note: 'Bulk registration successful.'
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}...`);
});