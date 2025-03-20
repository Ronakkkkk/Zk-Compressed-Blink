import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import {
  getAssociatedTokenAddress,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

// Constants
const DECIMALS = 9;
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=b9d5f51e-180d-4822-84f4-664cfe7c8f56";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const actionMetadata: ActionGetResponse = {
    icon: "https://cdn.prod.website-files.com/636e894daa9e99940a604aef/66a0c396c60f181c53734c94_Add%20Solana%20to%20MetaMask%20(5).webp",
    title: "Mint Compressed Tokens",
    description: "Mint and receive compressed tokens directly into your wallet.",
    label: "Mint Compressed Tokens",
    links: {
      actions: [
        {
          label: "Mint compressed tokens",
          href: `${url.href}?amount=1000`,
          type: "transaction",
        },
      ],
    },
  };

  return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    // Parse request data
    const url = new URL(request.url);
    const amount = Number(url.searchParams.get("amount")) || 1000;
    const body: ActionPostRequest = await request.json();

    // Validate user public key
    let user;
    try {
      user = new PublicKey(body.account);
    } catch (error) {
      return new Response("Invalid account", { status: 400, headers: ACTIONS_CORS_HEADERS });
    }

    // Setup connection
    const connection = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

    // Generate mint keypair
    const mint = Keypair.generate();
    
    // Calculate space for mint and required lamports
    const MINT_SIZE = 82;
    const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

    // Get the user's Associated Token Account
    const ata = await getAssociatedTokenAddress(
      mint.publicKey,
      user,
      false,
      TOKEN_PROGRAM_ID
    );

    // Create transaction
    const transaction = new Transaction();

    // 1. Create and initialize the mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: user,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint.publicKey,
        DECIMALS,
        user,
        null,
        TOKEN_PROGRAM_ID
      )
    );

    // 2. Create the Associated Token Account if it doesn't exist
    transaction.add(
      createAssociatedTokenAccountInstruction(
        user, // Payer
        ata, // ATA address
        user, // Owner
        mint.publicKey, // Mint
        TOKEN_PROGRAM_ID
      )
    );

    // 3. Mint tokens to the user's ATA
    transaction.add(
      createMintToInstruction(
        mint.publicKey, // Mint
        ata, // Destination
        user, // Authority
        amount * (10 ** DECIMALS), // Amount adjusted for decimals
        [], // Multigsig signers (none)
        TOKEN_PROGRAM_ID
      )
    );

    // Set blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = user;

    // Partial sign with mint keypair
    transaction.partialSign(mint);

    // Create response
    const response = await createPostResponse({
      fields: {
        transaction: transaction,
        type: "transaction",
      },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Error in POST:", error);
    return new Response(`Error: ${error || "Unknown error"}`, { 
      status: 500, 
      headers: ACTIONS_CORS_HEADERS 
    });
  }
}