import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { clusterApiUrl, Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { CompressedTokenProgram } from "@lightprotocol/compressed-token";

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
          label: "Compress Token",
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

    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    
    // Create a new transaction
    const transaction = new Transaction();
    
    // Generate a new keypair for the mint address
    const mintKeypair = Keypair.generate();
    const mintAddress = mintKeypair.publicKey;
    
    // Get rent exempt balance
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
    
    // Add both instructions to the transaction
    if (Array.isArray(createMintInstructions)) {
      createMintInstructions.forEach(ix => transaction.add(ix));
    } else {
      transaction.add(createMintInstructions);
    }
    transaction.add(mintToIx);

    // Get recent blockhash for the transaction
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.lastValidBlockHeight = blockhash.lastValidBlockHeight;
    transaction.feePayer = user;

    // Create response with information about the new mint
    const mintInfo = {
      mintAddress: mintAddress.toString(),
      tokenAmount: amount,
      decimals: decimals,
      owner: user.toString()
    };

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