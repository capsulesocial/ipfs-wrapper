import type { IPFS, Options, CID } from 'ipfs-core';

export interface IPFSInterface {
	sendData: (content: string | ArrayBuffer) => Promise<string>;
	getData: (cid: string) => Promise<string>;
	getJSONData: <T>(hash: string) => Promise<T>;
	sendJSONData: <T>(content: T) => Promise<string>;
	getNodes: () => Promise<number>;
	loadingResult: Promise<{ create: (options?: Options | undefined) => Promise<IPFS>; CID: typeof CID }>;
	initResult: Promise<{ ipfs: IPFS; CIDObj: typeof CID }>;
	startResult: Promise<void>;
}
