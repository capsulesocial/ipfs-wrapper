# ipfs-wrapper

![npm (scoped)](https://img.shields.io/npm/v/@capsulesocial/ipfs-wrapper) ![Discord](https://img.shields.io/discord/809438859053629450)

A wrapper around [ipfs-core](https://www.npmjs.com/package/ipfs-core) for speeding up the loading of web3 frontend applications.

Used on [Blogchain](https://blogchain.app).

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
