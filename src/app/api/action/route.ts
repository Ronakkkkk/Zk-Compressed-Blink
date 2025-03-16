import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createRpc, bn } from '@lightprotocol/stateless.js';
import { CompressedTokenProgram } from '@lightprotocol/compressed-token';

export async function GET(request: Request) {
  const url = new URL(request.url);
  
  const actionMetadata: ActionGetResponse = {
    icon: "https://cdn.prod.website-files.com/636e894daa9e99940a604aef/66a0c396c60f181c53734c94_Add%20Solana%20to%20MetaMask%20(5).webp",
    title: "Compress Token",
    description: "Create and mint compressed tokens using Light Protocol",
    label: "Compress",
    links: {
      actions: [
        {
          label: "Mint Compressed Token",
          href: `${url.href}?amount=1000`,
          type: "transaction"
        }
      ]
    }
  };

  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const amount = Number(url.searchParams.get("amount")) || 1000;
    const decimals = Number(url.searchParams.get("decimals")) || 9;
    const body: ActionPostRequest = await request.json();

    let user;
    try {
      user = new PublicKey(body.account);
    } catch (error) {
      return new Response("Invalid account", { status: 400, headers: ACTIONS_CORS_HEADERS });
    }

    // Connect to Light Protocol RPC
    const RPC_ENDPOINT =  'https://mainnet.helius-rpc.com/?api-key=b9d5f51e-180d-4822-84f4-664cfe7c8f56';
    const connection = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);
    
    // Create a mint keypair - will need to be included in the response
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey;
    
    // Convert amount to the proper format using bn helper
    const tokenAmount = bn(amount * 10 ** decimals);
    
    // Create a new transaction
    const transaction = new Transaction();
    const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(82);
    
    // 1. Create the mint instruction
    const createMintInstructions  = await CompressedTokenProgram.createMint({
      feePayer: user,
      authority: user,
      mint: mintAddress,
      decimals: decimals,
      freezeAuthority: user,
      rentExemptBalance: rentExemptBalance
    });

    
    
    // 2. Mint tokens to the user's wallet instruction
    const mintToIx = await CompressedTokenProgram.mintTo({
      feePayer: user,
      authority: user,
      mint: mintAddress,
      toPubkey: user,
      amount: amount,
    });
    
    
    // Add instructions to the transaction
    if (Array.isArray(createMintInstructions)) {
      createMintInstructions.forEach(ix => transaction.add(ix));
    } else {
      transaction.add(createMintInstructions);
    }
    transaction.add(mintToIx);

    // Get recent blockhash
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.feePayer = user;

    // Add the mint keypair to the response so the client can sign and save it
    const response = await createPostResponse({
      fields: {
        transaction: transaction,
        type: "transaction",
      }
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Error in POST:", error);
    return new Response(`Error: ${error}`, { status: 500, headers: ACTIONS_CORS_HEADERS });
  }
}