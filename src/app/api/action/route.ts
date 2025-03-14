import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions"
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  LightSystemProgram,
  Rpc,
  confirmTx,
  createRpc,
} from "@lightprotocol/stateless.js";
import { createMint, mintTo,  } from "@lightprotocol/compressed-token";


// Define HTTP methods that are allowed
export const OPTIONS = {
  methods: ['GET', 'POST', 'OPTIONS']
};

// Define custom CORS headers that include dial.to
const CUSTOM_CORS_HEADERS = {
  ...ACTIONS_CORS_HEADERS,
  "Access-Control-Allow-Origin": "https://dial.to",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// Handle OPTIONS requests for CORS preflight
export async function handleOptions(request: Request) {
  return new Response(null, { headers: CUSTOM_CORS_HEADERS });
}

export async function GET(request: Request) {
  // Handle OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  const url = new URL(request.url)
  
  const actionMetadata: ActionGetResponse={
    icon:"https://cdn.prod.website-files.com/636e894daa9e99940a604aef/66a0c396c60f181c53734c94_Add%20Solana%20to%20MetaMask%20(5).webp",
    title:"Mint Compressed Tokens",
    description:"Mint compressed tokens powered by ZK Compression. Enter the token metadata and mint your token!",
    label:"Compress",
    links: 
      {
        actions:[
          {
            label: "Compress 1 USDC",
            href: `${url.href}?name={name}&symbol={symbol}&decimals={decimals}&supply={supply}`,
            type: "transaction",
            parameters:[
              {
                name: "name", 
                label: "Token Name", 
                type: "text", 
                required: true,
              },
              {
                name: "symbol",
                label: "Token Symbol",
                type: "text",
                required: true,
              },
              {
                name: "decimals",
                label: "Decimals",
                type: "number",
                required: true,
              },
              {
                name: "supply",
                label: "Initial Supply",
                type: "number",
                required: true,
              },
            ]
          },
          
        ]
      }
  }
  
  return Response.json(actionMetadata, {headers: CUSTOM_CORS_HEADERS})
}

export async function POST(request: Request) {
  // Handle OPTIONS requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  const RPC_ENDPOINT = "https://devnet.helius-rpc.com/?api-key=b9d5f51e-180d-4822-84f4-664cfe7c8f56";
  const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

  const url = new URL(request.url);
  const name = url.searchParams.get("name") || "MyToken";
  const symbol = url.searchParams.get("symbol") || "MTK";
  const decimals = Number(url.searchParams.get("decimals")) || 9;
  const supply = Number(url.searchParams.get("supply")) || 1000;
  const body: ActionPostRequest = await request.json();

  let sender: PublicKey;
  try {
    sender = new PublicKey(body.account);
  } catch (error) {
    return new Response("Invalid account", { status: 400, headers: CUSTOM_CORS_HEADERS });
  }

  const payer = Keypair.generate();

  // Airdrop lamports to the payer for fees (devnet only)
  await confirmTx(
    connection,
    await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL)
  );

  // Execute createMint separately
  const { mint, transactionSignature: mintTxSignature } = await createMint(
    connection,
    payer,
    payer.publicKey,  
    decimals,
    
  );

  console.log(`create-mint success! txId: ${mintTxSignature}`);

  // Create transaction for mintTo
  const transaction = new Transaction();

  // Execute mintTo and get the transaction signature
  const mintToTxSignature = await mintTo(
    connection,
    payer,
    mint,
    sender,  // Destination
    payer, // Authority
    supply * Math.pow(10, decimals)
  );

  console.log(`Minted ${supply} tokens to ${sender.toBase58()} was a success!`);
  console.log(`txId: ${mintToTxSignature}`);

  // Set the recent blockhash and fee payer
  const blockhash = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash.blockhash;
  transaction.lastValidBlockHeight = blockhash.lastValidBlockHeight;
  transaction.feePayer = sender;

  // Partial sign with payer for devnet testing
  transaction.partialSign(payer);

  // Return the transaction to the client
  const response = await createPostResponse({
    fields: {
      transaction,
      type: "transaction",
      message: `Minted ${supply} ${symbol} tokens (Mint: ${mint.toBase58()})`
    },
  });

  return Response.json(response, { headers: CUSTOM_CORS_HEADERS });
}