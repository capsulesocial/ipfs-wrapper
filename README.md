# ipfs-wrapper

A wrapper around [ipfs-core](https://www.npmjs.com/package/ipfs-core) for speeding up the loading of web3 frontend applications.

It's used on [Blogchain](https://blogchain.app).

## Requirements

- NodeJS v14.5.0 or higher.

## Usage

```typescript
import ipfs, { initIPFS } from '@capsulesocial/capsule-ipfs'

initIPFS();

(async () => {
    const data = { foo: "random json data" };
    const cid = await ipfs().sendJSONData(data);
    const receivedData = await ipfs().getJSONData(cid);

    console.log(receivedData);
})();
```

## License 

[GNU GENERAL PUBLIC LICENSE 3](./LICENSE)
