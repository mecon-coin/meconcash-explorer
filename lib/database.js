var mongoose = require('mongoose'),
    Stats = require('../models/stats'),
    Address = require('../models/address'),
    Tx = require('../models/tx'),
    lib = require('./explorer');

var ObjectId = require('mongoose').Types.ObjectId; 


function find_address(hash, cb) {
    Address.findOne({
        a_id: hash
    }, function (err, address) {
        if (address) {
            return cb(address);
        } else {
            return cb();
        }
    });
}

function update_address(hash, txid, amount, type, cb) {
    // Check if address exists
    find_address(hash, function (address) {
        if (address) {
            // if coinbase (new coins PoW), update sent only and return cb.
            if (hash == 'coinbase') {
                Address.update({
                    a_id: hash
                }, {
                    sent: address.sent + amount,
                    balance: 0,
                }, function () {
                    return cb();
                });
            } else {
                // ensure tx doesnt already exist in address.txs
                lib.is_unique(address.txs, txid, function (unique, index) {
                    var tx_array = address.txs;
                    var received = address.received;
                    var sent = address.sent;
                    if (type == 'vin') {
                        sent = sent + amount;
                    } else {
                        received = received + amount;
                    }
                    if (unique == true) {
                        tx_array.push({
                            addresses: txid,
                            type: type
                        });
                        if (tx_array.length > process.env.LAST_TXS) {
                            tx_array.shift();
                        }
                        Address.update({
                            a_id: hash
                        }, {
                            txs: tx_array,
                            received: received,
                            sent: sent,
                            balance: received - sent
                        }, function () {
                            return cb();
                        });
                    } else {
                        if (type == tx_array[index].type) {
                            return cb(); //duplicate
                        } else {
                            Address.update({
                                a_id: hash
                            }, {
                                txs: tx_array,
                                received: received,
                                sent: sent,
                                balance: received - sent
                            }, function () {
                                return cb();
                            });
                        }
                    }
                });
            }
        } else {
            //new address
            if (type == 'vin') {
                var newAddress = new Address({
                    a_id: hash,
                    txs: [{
                        addresses: txid,
                        type: 'vin'
                    }],
                    sent: amount,
                    balance: amount,
                });
            } else {
                var newAddress = new Address({
                    a_id: hash,
                    txs: [{
                        addresses: txid,
                        type: 'vout'
                    }],
                    received: amount,
                    balance: amount,
                });
            }

            newAddress.save(function (err) {
                if (err) {
                    return cb(err);
                } else {
                    //console.log('address saved: %s', hash);
                    //console.log(newAddress);
                    return cb();
                }
            });
        }
    });
}

function find_tx(txid, cb) {
    Tx.findOne({
        txid: txid
    }, function (err, tx) {
        if (tx) {
            return cb(tx);
        } else {
            return cb(null);
        }
    });
}

function save_tx(txid, cb) {
    //var s_timer = new Date().getTime();
    lib.get_rawtransaction(txid, function (tx) {
        if (tx != 'There was an error. Check your console.') {
            lib.get_block(tx.blockhash, function (block) {
                if (block) {
                    lib.prepare_vin(tx, function (vin) {
                        lib.prepare_vout(tx.vout, txid, vin, function (vout, nvin) {
                            lib.syncLoop(vin.length, function (loop) {
                                var i = loop.iteration();
                                update_address(nvin[i].addresses, txid, nvin[i].amount, 'vin', function () {
                                    loop.next();
                                });
                            }, function () {
                                lib.syncLoop(vout.length, function (subloop) {
                                    var t = subloop.iteration();
                                    if (vout[t].addresses) {
                                        update_address(vout[t].addresses, txid, vout[t].amount, 'vout', function () {
                                            subloop.next();
                                        });
                                    } else {
                                        subloop.next();
                                    }
                                }, function () {
                                    lib.calculate_total(vout, function (total) {
                                        var newTx = new Tx({
                                            txid: tx.txid,
                                            vin: nvin,
                                            vout: vout,
                                            total: total.toFixed(8),
                                            timestamp: tx.time,
                                            blockhash: tx.blockhash,
                                            blockindex: block.height,
                                        });
                                        newTx.save(function (err) {
                                            if (err) {
                                                return cb(err);
                                            } else {
                                                //console.log('txid: ');
                                                return cb();
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else {
                    return cb('block not found: ' + tx.blockhash);
                }
            });
        } else {
            return cb('tx not found: ' + txid);
        }
    });
}

module.exports = {
    // initialize DB
    connect: function (database, cb) {
        mongoose.connect(database, function (err) {
            if (err) {
                console.log('Unable to connect to database: %s', database);
                console.log('Aborting');
                process.exit(1);

            }
            //console.log('Successfully connected to MongoDB');
            return cb();
        });
    },

    check_stats: function (coin, cb) {
        Stats.findOne({
            coin: coin
        }, function (err, stats) {
            if (stats) {
                return cb(true);
            } else {
                return cb(false);
            }
        });
    },

    get_stats: function (coin, cb) {
        Stats.findOne({
            coin: coin
        }, function (err, stats) {
            if (stats) {
                return cb(stats);
            } else {
                return cb(null);
            }
        });
    },

    create_stats: function (coin, cb) {
        var newStats = new Stats({
            coin: coin,
        });

        newStats.save(function (err) {
            if (err) {
                console.log(err);
                return cb();
            } else {
                console.log("initial stats entry created for %s", coin);
                //console.log(newStats);
                return cb();
            }
        });
    },

    get_address: function (hash, cb) {
        find_address(hash, function (address) {
            return cb(address);
        });
    },

    get_tx: function (txid, cb) {
        find_tx(txid, function (tx) {
            return cb(tx);
        });
    },

    get_txs: function (block, cb) {
        var txs = [];
        lib.syncLoop(block.tx.length, function (loop) {
            var i = loop.iteration();
            find_tx(block.tx[i], function (tx) {
                if (tx) {
                    txs.push(tx);
                    loop.next();
                } else {
                    loop.next();
                }
            })
        }, function () {
            return cb(txs);
        });
    },

    create_tx: function (txid, cb) {
        save_tx(txid, function (err) {
            if (err) {
                return cb(err);
            } else {
                //console.log('tx stored: %s', txid);
                return cb();
            }
        });
    },

    create_txs: function (block, cb) {
        lib.syncLoop(block.tx.length, function (loop) {
            var i = loop.iteration();
            save_tx(block.tx[i], function (err) {
                if (err) {
                    loop.next();
                } else {
                    //console.log('tx stored: %s', block.tx[i]);
                    loop.next();
                }
            });
        }, function () {
            return cb();
        });
    },

    get_last_txs: function (count, min, cb) {
        Tx.find({
            'total': {
                $gt: min
            }
        }).sort({
            _id: 'desc'
        }).limit(count).exec(function (err, txs) {
            if (err) {
                return cb(err);
            } else {
                return cb(txs);
            }
        });
    },

    get_page_txs: function (count, start, cb) {
        Tx.find({
            '_id': {
                $lt: new ObjectId(start)
            }
        }).sort(count).exec(function (err, txs) {
            if (err) {
                return cb(err);
            } else {
                return cb(txs);
            }
        });
    },

    // updates stats data for given coin; called by sync.js
    update_db: function (coin, cb) {
        lib.get_blockcount(function (count) {
            if (!count) {
                console.log('Unable to connect to explorer API');
                return cb(false);
            }
            lib.get_supply(function (supply) {
                lib.get_connectioncount(function (connections) {
                    Stats.update({
                        coin: coin
                    }, {
                        coin: coin,
                        count: count,
                        supply: supply,
                        connections: connections,
                    }, function () {
                        return cb(true);
                    });
                });
            });
        });
    },

    // updates tx, address & richlist db's; called by sync.js
    update_tx_db: function (coin, start, end, timeout, cb) {
        lib.syncLoop((end - start) + 1, function (loop) {
            var x = loop.iteration();
            if (x % 5000 === 0) {
                Tx.find({}).where('blockindex').lt(start + x).sort({
                    timestamp: 'desc'
                }).limit(parseInt(process.env.LAST_TXS)).exec(function (err) {
                    if (err) console.log(err);
                    Stats.update({
                        coin: coin
                    }, {
                        last: start + x - 1,
                        last_txs: '' //not used anymore left to clear out existing objects
                    }, function () {});
                });
            }
            lib.get_blockhash(start + x, function (blockhash) {
                if (blockhash) {
                    lib.get_block(blockhash, function (block) {
                        if (block) {
                            lib.syncLoop(block.tx.length, function (subloop) {
                                var i = subloop.iteration();
                                Tx.findOne({
                                    txid: block.tx[i]
                                }, function (err, tx) {
                                    if (tx) {
                                        tx = null;
                                        subloop.next();
                                    } else {
                                        save_tx(block.tx[i], function (err) {
                                            if (err) {
                                                console.log(err);
                                            } else {
                                                console.log('%s: %s', block.height, block.tx[i]);
                                            }
                                            setTimeout(function () {
                                                tx = null;
                                                subloop.next();
                                            }, timeout);
                                        });
                                    }
                                });
                            }, function () {
                                blockhash = null;
                                block = null;
                                loop.next();
                            });
                        } else {
                            console.log('block not found: %s', blockhash);
                            loop.next();
                        }
                    });
                } else {
                    loop.next();
                }
            });
        }, function () {
            Tx.find({}).sort({
                timestamp: 'desc'
            }).limit(parseInt(process.env.LAST_TXS)).exec(function (err) {
                if (err) console.log(err);
                Stats.update({
                    coin: coin
                }, {
                    last: end,
                    last_txs: '' //not used anymore left to clear out existing objects
                }, function () {
                    return cb();
                });
            });
        });
    },

    create_peer: function (params, cb) {
        var newPeer = new Peers(params);
        newPeer.save(function (err) {
            if (err) {
                console.log(err);
                return cb();
            } else {
                return cb();
            }
        });
    },

    find_peer: function (address, cb) {
        Peers.findOne({
            address: address
        }, function (err, peer) {
            if (err) {
                return cb(null);
            } else {
                if (peer) {
                    return cb(peer);
                } else {
                    return cb(null)
                }
            }
        })
    },

    get_peers: function (cb) {
        Peers.find({}, function (err, peers) {
            if (err) {
                return cb([]);
            } else {
                return cb(peers);
            }
        });
    }
};