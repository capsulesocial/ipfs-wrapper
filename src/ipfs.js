const defaultIpfsConfig = {
    start: false,
    libp2p: {
        peerStore: { persistence: false },
    },
    init: { algorithm: `RSA` },
    preload: {
        enabled: false,
    },
    config: {
        Bootstrap: undefined,
    },
};
/**
 * An IPFS interface is created, but the node doesn't start right away. Generally we observed that the node starting procedure is slow and blocks the loading of the whole app.
 * Hence, we made the loading of the node async and we basically keep a cache of all the requests to IPFS while the node is initialising to dispatch them after the fact.
 */
function createIPFSInterface(bootstrapNodes, ipfsConfig = defaultIpfsConfig) {
    let ipfsInitialised = false;
    let node = null;
    let CIDClass = null;
    if (ipfsConfig.config === undefined) {
        ipfsConfig.config = {};
    }
    ipfsConfig.config.Bootstrap = bootstrapNodes;
    const loadingResult = import(`ipfs-core`);
    const promise = loadingResult.then(async ({ create, CID: CIDObj }) => {
        const ipfs = await create(ipfsConfig);
        return { ipfs, CIDObj };
    });
    const promiseCache = [];
    function _resolveCachedPromises() {
        for (const v of promiseCache) {
            const { resolver, func, args } = v;
            resolver(func(...args));
        }
        // Clear the array
        promiseCache.splice(0, promiseCache.length);
    }
    function _promiseWrapper(func, ...args) {
        if (ipfsInitialised) {
            return func(...args);
        }
        let resolver = () => null;
        const promise = new Promise((resolve) => {
            resolver = resolve;
        });
        promiseCache.push({ func, args, resolver });
        return promise;
    }
    function _maintainConnection() {
        setTimeout(async () => {
            await ensureConnectedToBootstrapNodes();
            _maintainConnection();
        }, 10000);
    }
    async function ensureConnectedToBootstrapNodes() {
        if (!node) {
            throw new Error(`Not initialised!`);
        }
        // get a list of all addresses for all of the peers we're currently connected to
        const peerAddrs = new Set();
        try {
            const swarmAddrs = await node.swarm.addrs({ timeout: 5000 });
            swarmAddrs.forEach((p) => p.addrs.forEach((a) => peerAddrs.add(a.toString())));
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.log(`Failed to get IPFS swarm addreses: ${err}`);
            return;
        }
        // get a list of boostrap nodes that we're not currently connected to, and try connecting to them
        const disconnectedBootstrapNodes = bootstrapNodes.filter((bootstrapNode) => !peerAddrs.has(bootstrapNode));
        for (const a of disconnectedBootstrapNodes) {
            try {
                await node.swarm.connect(a);
            }
            catch (err) {
                // eslint-disable-next-line no-console
                console.error(`Failed to connect to ${a}: ${err}`);
            }
        }
    }
    const getData = async (cid) => {
        if (!node) {
            throw new Error(`Not initialised!`);
        }
        const content = [];
        for await (const chunk of node.cat(cid)) {
            content.push(Buffer.from(chunk));
        }
        return Buffer.concat(content).toString();
    };
    const getJSONData = async (cid) => {
        if (!node || !CIDClass) {
            throw new Error(`Not initialised!`);
        }
        const res = await node.dag.get(CIDClass.parse(cid));
        if (!res.value) {
            throw new Error(`No data found!`);
        }
        return res.value;
    };
    const sendData = async (content) => {
        if (!node) {
            throw new Error(`Not initialised!`);
        }
        const { cid } = await node.add(content);
        return cid.toString();
    };
    const sendJSONData = async (content) => {
        if (!node) {
            throw new Error(`Not initialised!`);
        }
        const cid = await node.dag.put(content);
        return cid.toString();
    };
    const getNodes = async () => {
        if (!node) {
            throw new Error(`Not initialised!`);
        }
        const peers = await node.swarm.peers();
        return peers.length;
    };
    const initResult = promise;
    const startResult = promise.then(async ({ ipfs, CIDObj }) => {
        node = ipfs;
        CIDClass = CIDObj;
        await node.start();
        ipfsInitialised = true;
        _maintainConnection();
        _resolveCachedPromises();
    });
    return {
        getJSONData: (cid) => _promiseWrapper(getJSONData, cid),
        sendJSONData: (content) => _promiseWrapper(sendJSONData, content),
        sendData: (content) => _promiseWrapper(sendData, content),
        getData: (cid) => _promiseWrapper(getData, cid),
        getNodes: () => _promiseWrapper(getNodes),
        loadingResult,
        initResult,
        startResult,
    };
}
let _ipfs = null;
export function initIPFS(bootstrapNodes, ipfsConfig = defaultIpfsConfig) {
    if (_ipfs) {
        return _ipfs;
    }
    _ipfs = createIPFSInterface(bootstrapNodes, ipfsConfig);
    return _ipfs;
}
export function ipfs() {
    if (!_ipfs) {
        throw new Error(`IPFS isn't initiated!`);
    }
    return _ipfs;
}
//# sourceMappingURL=ipfs.js.map