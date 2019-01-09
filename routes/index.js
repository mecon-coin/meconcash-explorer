var express = require('express');
var router = express.Router();
var db = require('../lib/database');
var lib = require('../lib/explorer');

function route_get_index(res, error) {
  res.render('index', { active: 'Explorer', error: error, warning: null});
}

function route_get_address(res, hash, count) {
  db.get_address(hash, function(address) {
    if (address) {
      var txs = [];
      var hashes = address.txs.reverse();
      if (address.txs.length < count) {
        count = address.txs.length;
      }
      lib.syncLoop(count, function (loop) {
        var i = loop.iteration();
        db.get_tx(hashes[i].addresses, function(tx) {
          if (tx) {
            txs.push(tx);
            loop.next();
          } else {
            loop.next();
          }
        });
      }, function(){

        res.render('address', { active: 'address', address: address, txs: txs});
      });

    } else {
      route_get_index(res, hash + ' not found');
    }
  });
}

function route_get_block(res, blockhash) {
  lib.get_block(blockhash, function (block) {
    if (block != 'There was an error. Check your console.') {
      if (blockhash == process.env.GENESIS_BLOCK) {
        res.render('block', { active: 'block', block: block, txs: 'GENESIS'});
      } else {
        db.get_txs(block, function(txs) {
          if (txs.length > 0) {
            res.render('block', { active: 'block', block: block, txs: txs});
          } else {
            db.create_txs(block, function(){
              db.get_txs(block, function(ntxs) {
                if (ntxs.length > 0) {
                  res.render('block', { active: 'block', block: block, txs: ntxs});
                } else {
                  route_get_index(res, 'Block not found: ' + blockhash);
                }
              });
            });
          }
        });
      }
    } else {
      route_get_index(res, 'Block not found: ' + blockhash);
    }
  });
}

function route_get_tx(res, txid) {
  if (txid == process.env.GENESIS_TX) {
    route_get_block(res, process.env.GENESIS_BLOCK);
  } else {
    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          res.render('tx', { active: 'tx', tx: tx, blockcount: blockcount });
        });
      }
      else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx.txid) {
            lib.prepare_vin(rtx, function(vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, function(rvout, rvin) {
                lib.calculate_total(rvout, function(total){
                  if (!rtx.confirmations > 0) {
                    var utx = {
                      txid: rtx.txid,
                      vin: rvin,
                      vout: rvout,
                      total: total.toFixed(8),
                      timestamp: rtx.time,
                      blockhash: '-',
                      blockindex: -1,
                    };
                    res.render('tx', { active: 'tx', tx: utx, blockcount: -1 });
                  } else {
                    var utx = {
                      txid: rtx.txid,
                      vin: rvin,
                      vout: rvout,
                      total: total.toFixed(8),
                      timestamp: rtx.time,
                      blockhash: rtx.blockhash,
                      blockindex: rtx.blockheight,
                    };
                    lib.get_blockcount(function(blockcount) {
                      res.render('tx', { active: 'tx', tx: utx, blockcount: blockcount });
                    });
                  }
                });
              });
            });
          } else {
            route_get_index(res, null);
          }
        });
      }
    });
  }
}

/* GET home page. */
router.get('/', function(req, res) {
  route_get_index(res, null);
});

router.get('/tx/:txid', function(req, res) {
  route_get_tx(res, req.param('txid'));
});

router.get('/block/:hash', function(req, res) {
  route_get_block(res, req.param('hash'));
});

router.get('/address/:hash', function(req, res) {
  route_get_address(res, req.param('hash'), process.env.LAST_TXS);
});

router.get('/movement', function(req, res) {
  res.render('movement', { active: 'Movement' });
});

router.get('/info', function(req, res) {
  res.render('info', { active: 'info' });
});

router.post('/search', function(req, res) {
  var query = req.body.search;
  if (query.length == 64) {
    if (query == process.env.GENESIS_TX) {
      res.redirect('/block/' + process.env.GENESIS_TX);
    } else {
      db.get_tx(query, function(tx) {
        if (tx) {
          res.redirect('/tx/' + tx.txid);
        } else {
          lib.get_block(query, function(block) {
            if (block != 'There was an error. Check your console.') {
              res.redirect('/block/' + query);
            } else {
              route_get_index(res, `Search found no results for: ${query}` );
            }
          });
        }
      });
    }
  } else {
    db.get_address(query, function(address) {
      if (address) {
        res.redirect('/address/' + address.a_id);
      } else {
        lib.get_blockhash(query, function(hash) {
          if (hash != 'There was an error. Check your console.') {
            res.redirect('/block/' + hash);
          } else {
            route_get_index(res, `Search found no results for: ${query}` );
          }
        });
      }
    });
  }
});

router.get('/ext/summary', function (req, res) {
  lib.get_difficulty(function (difficulty) {
    difficultyHybrid = ''
    if (difficulty['proof-of-work']) {
      difficulty = difficulty['proof-of-work'].toFixed(8) + ' / ' + difficulty['proof-of-stake'].toFixed(8);
    }
    lib.get_hashrate(function (hashrate) {
      lib.get_connectioncount(function (connections) {
        lib.get_blockcount(function (blockcount) {
          db.get_stats(process.env.COIN, function (stats) {
            if (hashrate == 'There was an error. Check your console.') {
              hashrate = 0;
            }
            res.send({
              data: [{
                difficulty: difficulty,
                difficultyHybrid: difficultyHybrid,
                supply: stats.supply,
                hashrate: hashrate,
                lastPrice: stats.last_price,
                connections: connections,
                blockcount: blockcount
              }]
            });
          });
        });
      });
    });
  });
});

router.get('/ext/getlasttxs/:min', function(req,res){
  db.get_last_txs(parseInt(process.env.LAST_TXS), (req.params.min * 100000000), function(txs){
    res.send({data: txs});
  });
});

router.get('/ext/getpagetxs/:start', function(req,res){
  db.get_page_txs(parseInt(process.env.LAST_TXS), req.params.start, function(txs){
    res.send({data: txs});
  });
});

module.exports = router;
