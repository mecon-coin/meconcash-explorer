require('dotenv').config()
const fs = require('fs')
const mongoose = require('mongoose')
const cron = require('node-cron')
const db = require('./lib/database')
const Stats = require('./models/stats')
const Address = require('./models/address')
const Tx = require('./models/tx')

const dbHost = process.env.DB_HOST
const dbPort = process.env.DB_PORT
const dbDatabase = process.env.DB_DATABASE
const dbUser = process.env.DB_USER
const dbPass = process.env.DB_PASS

const dbString = `mongodb://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbDatabase}`


const create_lock = (cb) => {
    const fname = './tmp/index.pid'
    fs.appendFile(fname, process.pid, (err) => {
        if (err) {
            console.log("Error: unable to create %s", fname)
            process.exit(1)
        } else {
            return cb()
        }
    })
}

const remove_lock = (cb) => {
    const fname = './tmp/index.pid'
    fs.unlink(fname, (err) => {
        if (err) {
            console.log("unable to remove lock: %s", fname)
            process.exit(1)
        } else {
            return cb()
        }
    })
}

const is_locked = (cb) => {
    const fname = './tmp/index.pid'
    fs.exists(fname, (exists) => {
        if (exists) {
            return cb(true)
        } else {
            return cb(false)
        }
    })
}

const exit = () => {
    remove_lock(() => {
        mongoose.disconnect()
        process.exit(0)
    })
}

const reindex = (stats) => {
    Tx.remove({}, (err) => {
        if (err) console.log('tx remove failed...')

        Address.remove({}, (err2) => {
            if (err2) console.log('address remove failed...')

            Stats.update({
                coin: process.env.COIN
            }, {
                last: 0,
            }, () => {
                console.log('index cleared (reindex)')
            })
            db.update_tx_db(process.env.COIN, 1, stats.count, process.env.UPDATE_TIMEOUT, () => {
                db.get_stats(process.env.COIN, (nstats) => {
                    console.log('reindex complete (block: %s)', nstats.last)
                    exit()
                })
            })
        })
    })
}

const check = (stats) => {
    db.update_tx_db(process.env.COIN, 1, stats.count, process.env.UPDATE_TIMEOUT, () => {
        db.get_stats(process.env.COIN, (nstats) => {
            console.log('check complete (block: %s)', nstats.last)
            exit()
        })
    })
}

const update = (stats) => {
    db.update_tx_db(process.env.COIN, stats.last, stats.count, process.env.UPDATE_TIMEOUT, () => {
        db.get_stats(process.env.COIN, (nstats) => {
            console.log('update complete (block: %s)', nstats.last)
            remove_lock(() => console.log('lock file has been removed'))
        })
    })
}

const sync = () => {
    is_locked(exists => {
        if (exists) {
            console.log("Script already running..")
        } else {
            create_lock(() => {
                console.log("script launched with pid: " + process.pid)
                mongoose.connect(dbString, err => {
                    if (err) {
                        console.log('Unable to connect to database: %s', dbString)
                        console.log('Aborting')
                        exit()
                    } else {
                        db.check_stats(process.env.COIN, exists => {
                            if (exists == false) {
                                console.log('Run \'npm start\' to create database structures before running this script.')
                                exit()
                            } else {
                                db.update_db(process.env.COIN, () => {
                                    db.get_stats(process.env.COIN, stats => {
                                        if (process.argv.length > 2) {
                                            if (process.argv[2] == 'reindex') reindex(stats)
                                            else if (process.argv[2] == 'check') check(stats)
                                            else {
                                                console.log('Use reindex or check option instead of %s', process.argv[2])
                                                exit()
                                            }
                                        } else {
                                            update(stats)
                                        }
                                    })
                                })
                            }
                        })
                    }
                })
            })
        }
    })
}

if (process.argv.length < 3) {
    cron.schedule('*/30 * * * * *', () => {
        sync()
    })
} else {
    sync()
}
