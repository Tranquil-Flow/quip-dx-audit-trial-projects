#!/usr/bin/env node
// Throwaway testnet prototype; never pass a mainnet RPC or a real wallet.
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync, openSync, closeSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, parseEther, formatEther, isAddress, zeroAddress } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { ShrincsSigner, ShrincsFactoryClient, getShrincsAddresses, getShrincsWalletAddress, v1Commitment } from '@quip.network/ethereum-sdk/v1/shrincs';
import { getNetworkAddresses } from '@quip.network/ethereum-sdk/v1';

const DIR = new URL('./keys/', import.meta.url), KEY = new URL('wallet.json', DIR), STATE = new URL('state.json', DIR), BURNS = new URL('burned-leaves.json', DIR);
const BASE_RPC = process.env.QUIP_RPC || 'https://sepolia.base.org';
const AG_RPC = 'https://evm-rpc.aglais.quip.network:20049';
const BASE = {id:84532,name:'Base Sepolia',nativeCurrency:{name:'Sepolia Ether',symbol:'ETH',decimals:18},rpcUrls:{default:{http:[BASE_RPC]}}};
function output(x){console.log(JSON.stringify(x,(_k,v)=>typeof v==='bigint'?v.toString():v,2));}
function save(url,data){writeFileSync(url,JSON.stringify(data,null,2)+'\n',{mode:0o600});chmodSync(url,0o600);}
function load(url){return JSON.parse(readFileSync(url,'utf8'));}
function secrets(){if(!existsSync(KEY))throw Error('Run init first. No existing wallet is loaded from elsewhere.');return load(KEY);}
function client(url){return createPublicClient({transport:http(url,{timeout:20000,retryCount:1})});}
async function base(){const publicClient=client(BASE_RPC);const id=await publicClient.getChainId();if(id!==84532)throw Error(`Refusing non-Base-Sepolia RPC: chain ${id}`);const addrs={...getNetworkAddresses(id),...getShrincsAddresses(id)};for(const [name,address] of [['WalletFactory',addrs.WalletFactory],['ShrincsWalletImplementation',addrs.ShrincsWalletImplementation],['ShrincsVerifier',addrs.ShrincsVerifier]]){const code=await publicClient.getCode({address});if(!code||code==='0x')throw Error(`${name} has no code at ${address} on ${id}`)}const s=secrets();const account=privateKeyToAccount(s.eoaPrivateKey);const walletClient=createWalletClient({account,chain:BASE,transport:http(BASE_RPC,{timeout:20000})});return {publicClient,walletClient,account,addrs};}
async function factory(){const b=await base();const signer=await ShrincsSigner.create(Buffer.from(secrets().pqSeed.slice(2),'hex'));const f=new ShrincsFactoryClient({publicClient:b.publicClient,walletClient:b.walletClient,account:b.account.address,chainId:84532});return {...b,signer,f,params:{signer,maxSignatures:16,derivationIndex:0,erc1271:{derivationIndex:1}}};}
const command=process.argv[2];
try{
 switch(command){
 case 'init':{
  mkdirSync(DIR,{recursive:true,mode:0o700});chmodSync(DIR,0o700);
  if(existsSync(KEY))throw Error('Keys already exist; refusing overwrite.');
  const fd=openSync(KEY,'wx',0o600);closeSync(fd);
  const s={eoaPrivateKey:generatePrivateKey(),pqSeed:'0x'+randomBytes(64).toString('hex')};save(KEY,s);
  output({eoa:privateKeyToAccount(s.eoaPrivateKey).address,keys:'./keys/wallet.json',note:'Brand-new disposable testnet keys; do not reuse.'});break;
 }
 case 'inspect':{
  const s=secrets(),a=privateKeyToAccount(s.eoaPrivateKey).address;
  const ag=client(AG_RPC),ba=client(BASE_RPC);const [agid,baid,agbal,babal]=await Promise.all([ag.getChainId(),ba.getChainId(),ag.getBalance({address:a}),ba.getBalance({address:a})]);
  let address=null;let state=null; if(existsSync(STATE)){state=load(STATE);address=state.address;}
  output({eoa:a,aglais:{chainId:agid,balanceAGLS:formatEther(agbal),explorer:`https://explorer.aglais.quip.network/address/${a}`},baseSepolia:{chainId:baid,balanceETH:formatEther(babal),explorer:`https://sepolia.basescan.org/address/${a}`},pqAccount:address,pqAccountBalanceETH:address?formatEther(await ba.getBalance({address})):null,state});break;
 }
 case 'faucet-aglais':{
  const a=privateKeyToAccount(secrets().eoaPrivateKey).address;const res=await fetch('https://faucet.aglais.quip.network/request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({dest:a})});const text=await res.text();output({status:res.status,body:text,destination:a,note:'AGLS on Aglais ONLY, not Base Sepolia ETH; this is an EOA, not a PQ account.'});if(!res.ok)process.exitCode=1;break;
 }
 case 'sign-demo':{
  const s=secrets(), signer=await ShrincsSigner.create(Buffer.from(s.pqSeed.slice(2),'hex'));
  const k=signer.deriveKeyPair({statefulIndex:0,statelessIndex:1,maxSignatures:16});
  // Local demonstration only, not an on-chain transfer authorization.
  const burns=existsSync(BURNS)?load(BURNS):[];const leaf=Array.from({length:16},(_,i)=>i+1).find(x=>!burns.includes(x));if(!leaf)throw Error('All demo slots spent');
  burns.push(leaf);save(BURNS,burns);const digest='0x'+randomBytes(32).toString('hex');const sig=k.signStatefulRawAt(digest,leaf);
  output({commitment:k.publicKeyCommitment,digest,leaf,verified:k.verifyStatefulRaw(digest,sig),note:'Local SDK SHRINCS sign/verify; NOT a submitted transfer. This leaf must not be used again on this key.'});break;
 }
 case 'transfer-aglais':{
  // Connectivity proof only: ECDSA EOA transfer, emphatically NOT PQ authorization.
  const s=secrets();const agChain={id:20033,name:'Aglais',nativeCurrency:{name:'AGLS',symbol:'AGLS',decimals:18},rpcUrls:{default:{http:[AG_RPC]}}};
  const ag=client(AG_RPC);if(await ag.getChainId()!==20033)throw Error('Aglais chain ID mismatch');
  const recipient=existsSync(new URL('recipient.json',DIR))?load(new URL('recipient.json',DIR)):null;
  let dest=recipient;if(!dest){dest={privateKey:generatePrivateKey()};save(new URL('recipient.json',DIR),dest)}
  const to=privateKeyToAccount(dest.privateKey).address,account=privateKeyToAccount(s.eoaPrivateKey);
  const wallet=createWalletClient({account,chain:agChain,transport:http(AG_RPC,{timeout:20000})});
  const estimated=await ag.estimateGas({account:account.address,to,value:parseEther('0.001')});
  const hash=await wallet.sendTransaction({account,chain:agChain,to,value:parseEther('0.001'),gas:estimated*12n/10n,gasPrice:1000000000n});
  const receipt=await ag.waitForTransactionReceipt({hash,timeout:120000});
  output({hash,status:receipt.status,from:account.address,to,amountAGLS:'0.001',explorer:`https://explorer.aglais.quip.network/tx/${hash}`,warning:'Classical ECDSA EOA transaction; NOT post-quantum signed and NOT a Quip Account transfer.'});break;
 }
 case 'create':{
  if(existsSync(STATE))throw Error('Already created/recorded; refusing duplicate deployment.');
  const b=await factory();const balance=await b.publicClient.getBalance({address:b.account.address});
  const cost=await b.f.estimateCreationCost(b.params);const required=cost.gasUnits*cost.gasPrice+cost.creationFee;
  output({estimatedCost:cost,requiredWei:required,eoaBalanceWei:balance});
  if(balance<required)throw Error('Insufficient Base Sepolia ETH; fund the printed EOA from a Base Sepolia faucet, then rerun create. Aglais AGLS cannot pay here.');
  const main=b.signer.recoverKeyPair(0,{maxSignatures:16}),erc=b.signer.recoverKeyPair(1,{maxSignatures:16});
  const predicted=getShrincsWalletAddress(b.f.factoryAddress,main.publicKeyCommitment,erc.publicKeyCommitment,b.account.address);
  const w=await b.f.createShrincsWallet(b.params);const address=w.walletAddress;
  if(address.toLowerCase()!==predicted.toLowerCase())throw Error(`Deployed ${address} differs from predicted ${predicted}`);
  const state={address,commitment:v1Commitment(main.publicKeyCommitment,erc.publicKeyCommitment,b.account.address),owner:b.account.address,chainId:84532,maxSignatures:16};save(STATE,state);
  output({...state,explorer:`https://sepolia.basescan.org/address/${address}`});break;
 }
 case 'fund-account':{
  const st=load(STATE),amount=process.argv[3];if(!amount||!/^\d+(\.\d{1,18})?$/.test(amount))throw Error('Usage: fund-account <ETH amount>');
  const b=await base();const hash=await b.walletClient.sendTransaction({account:b.account,chain:BASE,to:st.address,value:parseEther(amount)});const receipt=await b.publicClient.waitForTransactionReceipt({hash});output({hash,status:receipt.status,account:st.address,explorer:`https://sepolia.basescan.org/tx/${hash}`});if(receipt.status!=='success')process.exitCode=1;break;
 }
 case 'transfer':{
  const st=load(STATE),to=process.argv[3],amount=process.argv[4];if(!isAddress(to)||!amount||!/^\d+(\.\d{1,18})?$/.test(amount)||parseEther(amount)<=0n)throw Error('Usage: transfer <0x-recipient> <positive-ETH-amount>');
  const b=await factory(),w=await b.f.getShrincsWallet({derivationIndex:0,erc1271:{derivationIndex:1},owner:b.account.address,signer:b.signer,maxSignatures:16});
  if(w.walletAddress.toLowerCase()!==st.address.toLowerCase())throw Error('Local account mismatch');
  const burns=existsSync(BURNS)?load(BURNS):[];const ws=await w.getWalletState();const leaf=Array.from({length:ws.maxSignatures},(_,i)=>i+1).find(x=>!burns.includes(x));if(!leaf)throw Error('No unreserved local leaves');
  // Reserve durably BEFORE signing. Even failed/dropped broadcasts cannot reuse a leaf.
  burns.push(leaf);save(BURNS,burns);
  const prepared=await w.prepareExecute({target:to,value:parseEther(amount)},{leaf});
  output({leaf,estimatedCost:prepared.estimate,executeFee:prepared.executeFee});
  const receipt=await prepared.send();output({hash:receipt.transactionHash,status:receipt.status,from:st.address,to,amountETH:amount,explorer:`https://sepolia.basescan.org/tx/${receipt.transactionHash}`});break;
 }
 default:console.log('Usage: node wallet.mjs init|inspect|faucet-aglais|transfer-aglais|sign-demo|create|fund-account <ETH>|transfer <recipient> <ETH>');if(command)process.exitCode=2;
 }
}catch(e){console.error('ERROR:',e.shortMessage||e.message);process.exitCode=1;}
