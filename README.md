<div align="center">

<h1>ipfs-wrapper</h1>

Blogchain's IPFS wrapper

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