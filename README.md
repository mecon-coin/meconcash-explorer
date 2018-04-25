[![buddy pipeline](https://app.buddy.works/mecon-coin/meconcash-explorer/pipelines/pipeline/134502/badge.svg?token=5b65ba623fde6464e200d69e9ea8cedc04b7a01e5183080f2bee1e5e20a81143 "buddy pipeline")](https://app.buddy.works/mecon-coin/meconcash-explorer/pipelines/pipeline/134502)
[![CodeFactor](https://www.codefactor.io/repository/github/mecon-coin/meconcash-explorer/badge)](https://www.codefactor.io/repository/github/mecon-coin/meconcash-explorer)

# meconcash-explorer

Meconcash Block Explorer

## Requires

- Node.js
- pm2
- mongodb
- meconcashd

## Create Database

`$ mongo`

`> use explorerdb`

`> db.createUser( { user: "meconuser", pwd: "meconpass", roles: ["readWrite"] } )`

