var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');

var app = express();

// Additional Libraries
const Rollbar = require('rollbar')
const moesifExpress = require('moesif-express')
const bitcoinapi = require('bitcoin-node-api')

// Crash Reporting
const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR,
  captureUncaught: true,
  captureUnhandledRejections: true
})

// Monitoring
const moesif = moesifExpress({applicationId: process.env.MOESIF})
app.use(moesif)

// Bitcoinapi
const walletSettings = {
  host: process.env.WALLET_HOST,
  port: process.env.WALLET_PORT,
  user: process.env.WALLET_USER,
  pass: process.env.WALLET_PASS
}
bitcoinapi.setWalletDetails(walletSettings)
bitcoinapi.setAccess('only', [
  'getinfo',
  'getnetworkghps',
  'getmininginfo',
  'getdifficulty',
  'getconnectioncount',
  'getblockcount',
  'getblockhash',
  'getblock',
  'getrawtransaction',
  'getpeerinfo',
  'gettxoutsetinfo'
])

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', bitcoinapi.app)
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
