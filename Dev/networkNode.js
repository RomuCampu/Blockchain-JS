const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
// Creates a new and unique ID
const uuid = require('uuid/v1');
const port = process.argv[2];
const rp = require('request-promise');


const nodeAddress = uuid()
  .split('-')
  .join('');

const beblock = new Blockchain();

app.use(bodyParser.json());

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

app.get('/blockchain', function (req, res) {
  res.send(beblock);
});

app.post('/transaction', function (req, res) {
  const blockIndex = beblock.createNewTransaction(
    req.body.amount,
    req.body.sender,
    req.body.recipient
  );
  res.json({
    note: `Transaction will be added in block ${blockIndex}.`
  });
});

app.get('/mine', function (req, res) {
  const lastBlock = beblock.getLastBlock();
  const previousBlockHash = lastBlock['hash'];
  const currentBlockData = {
    transactions: beblock.pendingTransactions,
    index: lastBlock['index'] + 1
  };

  const nonce = beblock.proofOfWork(previousBlockHash, currentBlockData);
  const blockHash = beblock.hashBlock(
    previousBlockHash,
    currentBlockData,
    nonce
  );

  beblock.createNewTransaction(25, '00');

  const newBlock = beblock.createNewBlock(
    nonce,
    previousBlockHash,
    blockHash
  );

  res.json({
    note: 'New block mined succesfully',
    block: newBlock
  });
});

//Register a node and broadcast it to the network
app.post('/register-and-broadcast-node', function (req, res) {
  const newNodeUrl = req.body.newNodeUrl;
  beblock.networkNodes.push(newNodeUrl);
  if (beblock.networkNodes.indexOf(newNodeUrl) === -1) beblock.networkNodes.push(newNodeUrl);

  const regNodesPromises = [];
  beblock.networkNodes.forEach(networkNodeUrl => {
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

  Promise.all(regNodesPromises).then(data => {
    const bulkRegisterOptions = {
      uri: newNodeUrl + '/register-nodes-bulk',
      method: 'POST',
      body: {
        allNetworkNodes: [...beblock.networkNodes, beblock.currentNodeUrl]
      },
      json: true
    };

    return rp(bulkRegisterOptions);
  }).then(data => {
    res.json({
      note: 'New node registered with network successfully'
    });
  });
});




app.listen(port, function () {
  console.log(`Listening on port ${port}...`);
});