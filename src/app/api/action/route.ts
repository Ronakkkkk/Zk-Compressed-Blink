import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions"
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import {
  Rpc,
  confirmTx,
  createRpc,
} from "@lightprotocol/stateless.js";
import { createMint, mintTo } from "@lightprotocol/compressed-token";

// Use the new Next.js route handler configuration
export const dynamic = 'force-dynamic'; // Equivalent to getServerSideProps
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  const actionMetadata: ActionGetResponse = {
    icon: "https://cdn.prod.website-files.com/636e894daa9e99940a604aef/66a0c396c60f181c53734c94_Add%20Solana%20to%20MetaMask%20(5).webp",
    title: "Mint Compressed Tokens",
    description: "Mint compressed tokens powered by ZK Compression. Enter the token metadata and mint your token!",
    label: "Compress",
    links: {
      actions: [
        {
          label: "Compress 1 USDC",
          href: `${url.href}?name={name}&symbol={symbol}&decimals={decimals}&supply={supply}`,
          type: "transaction",
          parameters: [
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
  };
  
  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  const RPC_ENDPOINT = "https://devnet.helius-rpc.com/?api-key=b9d5f51e-180d-4822-84f4-664cfe7c8f56";
  const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

  const url = new URL(request.url);
  const name = url.searchParams.get("name") || "MyToken";
  const symbol = url.searchParams.get("symbol") || "MTK";
  const decimals = Number(url.searchParams.get("decimals")) || 9;
  const supply = Number(url.searchParams.get("supply")) || 1000;
  
  let body: ActionPostRequest;
  try {
    body = await request.json();
  } catch (error) {
    return new Response("Invalid request body", { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  let sender: PublicKey;
  try {
    sender = new PublicKey(body.account);
  } catch (error) {
    return new Response("Invalid account", { status: 400, headers: ACTIONS_CORS_HEADERS });
  }

  try {
    // Generate a new keypair for the transaction
    const payer = Keypair.generate();

    // Airdrop lamports to the payer for fees (devnet only)
    const airdropTx = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await confirmTx(connection, airdropTx);

    // Create the mint
    const { mint, transactionSignature: mintTxSignature } = await createMint(
      connection,
      payer,
      payer.publicKey,  
      decimals
    );
    console.log(`Create mint success! txId: ${mintTxSignature}`);

    // Create a new transaction for minting tokens
    const transaction = new Transaction();

    // Mint tokens to the specified account
    const mintToTxSignature = await mintTo(
      connection,
      payer,
      mint,
      sender,  // Destination
      payer,   // Authority
      supply * Math.pow(10, decimals)
    );
    console.log(`Minted ${supply} tokens to ${sender.toBase58()} was a success!`);
    console.log(`txId: ${mintToTxSignature}`);

    // Get the latest blockhash for the transaction
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.lastValidBlockHeight = blockhash.lastValidBlockHeight;
    transaction.feePayer = sender;

    // Partial sign with payer
    transaction.partialSign(payer);

    // Create and return the response
    const response = await createPostResponse({
      fields: {
        transaction,
        type: "transaction",
        message: `Minted ${supply} ${symbol} tokens (Mint: ${mint.toBase58()})`
      },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Transaction error:", error);
    return new Response(`Transaction failed: ${error}`, { 
      status: 500, 
      headers: ACTIONS_CORS_HEADERS 
    });
  }
}