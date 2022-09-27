/*
 * Copyright (c) 2021-2022 Capsule Social, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */
import type { Options, IPFS } from 'ipfs-core';
import type Multiformats from 'multiformats';
import { IPFSInterface } from './types';

const defaultIpfsConfig: Options = {
	start: false,
	libp2p: {
		peerStore: { persistence: false } as any,
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
function createIPFSInterface(bootstrapNodes: string[], ipfsConfig: Options = defaultIpfsConfig): IPFSInterface {
	let ipfsInitialised = false;
	let node: IPFS | null = null;
	let CIDClass: typeof Multiformats.CID | null = null;

	if (ipfsConfig.config === undefined) {
		ipfsConfig.config = {};
	}

	ipfsConfig.config.Bootstrap = bootstrapNodes;

	const loadingResult = import(`ipfs-core`);

	const promise = loadingResult.then(async ({ create }) => {
		const multiformats = await import(`multiformats`);
		const ipfs = await create(ipfsConfig);

		return { ipfs, CIDObj: multiformats.CID };
	});

	const promiseCache: Array<{
		func: (...args: any[]) => Promise<any>;
		args: any[];
		resolver: (value: any) => void;
	}> = [];

	function _resolveCachedPromises() {
		for (const v of promiseCache) {
			const { resolver, func, args } = v;
			resolver(func(...args));
		}

		// Clear the array
		promiseCache.splice(0, promiseCache.length);
	}

	function _promiseWrapper<T>(func: (...funcArgs: any[]) => Promise<T>, ...args: any[]) {
		if (ipfsInitialised) {
			return func(...args);
		}

		let resolver: (value: T) => void = () => null;
		const promise = new Promise<T>((resolve) => {
			resolver = resolve;
		});

		promiseCache.push({ func, args, resolver });

		return promise;
	}

	function _maintainConnection() {
		setTimeout(async () => {
			if (!ipfsInitialised) {
				return;
			}
			await ensureConnectedToBootstrapNodes();
			_maintainConnection();
		}, 10000);
	}

	async function ensureConnectedToBootstrapNodes() {
		if (!node) {
			throw new Error(`Not initialised!`);
		}
		// get a list of all addresses for all of the peers we're currently connected to
		const peerAddrs = new Set<string>();
		try {
			const swarmAddrs = await node.swarm.addrs({ timeout: 5000 });
			swarmAddrs.forEach((p) => p.addrs.forEach((a) => peerAddrs.add(a.toString())));
		} catch (err) {
			// eslint-disable-next-line no-console
			console.log(`Failed to get IPFS swarm addreses: ${err}`);
			return;
		}

		// get a list of boostrap nodes that we're not currently connected to, and try connecting to them
		const disconnectedBootstrapNodes = bootstrapNodes.filter((bootstrapNode: string) => !peerAddrs.has(bootstrapNode));
		for (const a of disconnectedBootstrapNodes) {
			try {
				await node.swarm.connect(a as any);
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error(`Failed to connect to ${a}: ${err}`);
			}
		}
	}

	const getData = async (cid: string) => {
		if (!node) {
			throw new Error(`Not initialised!`);
		}
		const content: Buffer[] = [];
		for await (const chunk of node.cat(cid)) {
			content.push(Buffer.from(chunk));
		}
		return Buffer.concat(content).toString();
	};

	const getJSONData = async <T>(cid: string) => {
		if (!node || !CIDClass) {
			throw new Error(`Not initialised!`);
		}
		const res = await node.dag.get(CIDClass.parse(cid));
		if (!res.value) {
			throw new Error(`No data found!`);
		}
		return res.value as T;
	};

	const sendData = async (content: string | ArrayBuffer) => {
		if (!node) {
			throw new Error(`Not initialised!`);
		}
		const { cid } = await node.add(content);
		return cid.toString();
	};

	const sendJSONData = async <T>(content: T) => {
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

	const stop = () => {
		if (!node) {
			throw new Error(`Not initialised`);
		}

		ipfsInitialised = false;
		return node.stop();
	};

	const start = async () => {
		if (!node) {
			throw new Error('Not initialised');
		}
		await node.start();
		ipfsInitialised = true;
		_maintainConnection();
		_resolveCachedPromises();
	};

	return {
		getJSONData: <T>(cid: string) => _promiseWrapper<T>(getJSONData, cid),
		sendJSONData: <T>(content: T) => _promiseWrapper<string>(sendJSONData, content),
		sendData: (content: string | ArrayBuffer) => _promiseWrapper(sendData, content),
		getData: (cid: string) => _promiseWrapper(getData, cid),
		getNodes: () => _promiseWrapper(getNodes),
		stop,
		start,
		loadingResult,
		initResult,
		startResult,
	};
}

let _ipfs: IPFSInterface | null = null;

export function initIPFS(bootstrapNodes: string[], ipfsConfig: Options = defaultIpfsConfig) {
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
