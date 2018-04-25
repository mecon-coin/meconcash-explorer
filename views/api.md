# Meconcash API Calling List

The block explorer provides an API allowing users and/or applications to retrieve information from the network without the need for a local wallet.

## API Calls

Return data from coind

*   **getdifficulty**  
    _Returns the current difficulty._  
    [http://explorer.meconcash.com/api/getdifficulty](/api/getdifficulty)
    
*   **getconnectioncount**  
    _Returns the number of connections the block explorer has to other nodes._  
    [http://explorer.meconcash.com/api/getconnectioncount](/api/getconnectioncount)
    
*   **getblockcount**  
    _Returns the current block index._  
    [http://explorer.meconcash.com/api/getblockcount](/api/getblockcount)
    
*   **getblockhash \[index\]**  
    _Returns the hash of the block at ; index 0 is the genesis block._  
    [http://explorer.meconcash.com/api/getblockhash?index=1337](/api/getblockhash?index=0)
    
*   **getblock \[hash\]**  
    _Returns information about the block with the given hash._  
    [http://explorer.meconcash.com/api/getblock?hash=1733320247b15ca2262be646397d1ffd6be953fa638ebb8f5dcbb4c2b91b34f1](/api/getblock?hash=0007c634863d2e61108f40d836c073b475903b50f837ff77c630e85d0f1e56fd)
    
*   **getrawtransaction \[txid\] \[decrypt\]**  
    _Returns raw transaction representation for given transaction id. decrypt can be set to 0(false) or 1(true)._  
    [http://explorer.meconcash.com/api/getrawtransaction?txid=d771ae57afcb44a35f5331b3dfe83e5e946590d376456b605748ea5cc08333b6&decrypt=0](/api/getrawtransaction?txid=d771ae57afcb44a35f5331b3dfe83e5e946590d376456b605748ea5cc08333b6&decrypt=0)  
    [http://explorer.meconcash.com/api/getrawtransaction?txid=d771ae57afcb44a35f5331b3dfe83e5e946590d376456b605748ea5cc08333b6&decrypt=1](/api/getrawtransaction?txid=d771ae57afcb44a35f5331b3dfe83e5e946590d376456b605748ea5cc08333b6&decrypt=1)

### Linking (GET)
*Linking to the block explorer*

*  **transaction (/tx/txid)**  
    [http://explorer.meconcash.com/tx/d771ae57afcb44a35f5331b3dfe83e5e946590d376456b605748ea5cc08333b6](/tx/d771ae57afcb44a35f5331b3dfe83e5e946590d376456b605748ea5cc08333b6)

*  **block (/block/hash)**  
    [http://explorer.meconcash.com/block/0007c634863d2e61108f40d836c073b475903b50f837ff77c630e85d0f1e56fd](/block/0007c634863d2e61108f40d836c073b475903b50f837ff77c630e85d0f1e56fd)

*  **address (/address/hash)**  
    [http://explorer.meconcash.com/address/M8aktDcLCGpVS8dBFF4XL7LdWLLpCah8MV](/address/M8aktDcLCGpVS8dBFF4XL7LdWLLpCah8MV)
