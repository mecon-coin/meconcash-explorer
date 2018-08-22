[![CodeFactor](https://www.codefactor.io/repository/github/mecon-coin/meconcash-explorer/badge)](https://www.codefactor.io/repository/github/mecon-coin/meconcash-explorer)

# meconcash-explorer

Meconcash Block Explorer

## Requires

- Node.js

  > [how to install node.js](https://nodejs.org/en/download/package-manager/)

- pm2

  > `sudo npm i -g pm2`

- mongodb

  > [how to install mongodb](https://docs.mongodb.com/manual/installation/)

- meconcashd

  > [Meconcash-core github](https://github.com/mecon-coin/meconcash-core)

## Create Database

Enter MongoDB CLI:

`$ mongo`

Create database:

`> use explorerdb`

Create user with read/write permission:

`> db.createUser( { user: "meconuser", pwd: "meconpass", roles: ["readWrite"] } )`

## Start Explorer

`pm2 reload pm2.config.json --env production`

> Please make sure that your explorer have all the required environmental variables.
>
> You may want to add the following lines in the middle of your CI module before start explorer.
>
> ```shell
> echo "ROLLBAR=${ROLLBAR}" >> .env
> echo "MOESIF=${MOESIF}" >> .env
> echo "DB_USER=${DB_USER}" >> .env
> echo "DB_PASS=${DB_PASS}" >> .env
> echo "WALLET_HOST=${WALLET_HOST}" >> .env
> echo "WALLET_PORT=${WALLET_PORT}" >> .env
> echo "WALLET_USER=${WALLET_USER}" >> .env
> echo "WALLET_PASS=${WALLET_PASS}" >> .env
> ```

## Wallet

Meconcash Explorer requires running meconcash core deamon with the following options

`meconcashd -daemon -txindex`

## Syncing database with the blockchain

Any database sync issue can be solved by doing the following command

`pm2 delete Sync`

`./sync.js reindex`

## Troubleshooting

If block explorer is not updating new blocks

`sudo rm ~/meconcash-explorer/tmp/index.pid`
