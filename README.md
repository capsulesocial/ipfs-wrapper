<div align="center">

<h1>ipfs-wrapper</h1>

A wrapper around [ipfs-core](https://www.npmjs.com/package/ipfs-core) for speeding up loading of frontend ipfs applications.

Powering [Blogchain](https://blogchain.app)

</div>

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
