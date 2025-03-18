import { ActionGetResponse, ActionPostRequest, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions";
import { Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { createRpc } from "@lightprotocol/stateless.js";
import { CompressedTokenProgram } from "@lightprotocol/compressed-token"; // Assuming this exposes the instruction methods
import {
  getAssociatedTokenAddress,
  createMintToInstruction,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  ExtensionType,
  getMintLen,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { createInitializeInstruction, pack, TokenMetadata } from "@solana/spl-token-metadata";
import { BN } from "bn.js"; // For handling big numbers

export async function GET(request: Request) {
  const url = new URL(request.url);

  const actionMetadata: ActionGetResponse = {
    icon: "https://cdn.prod.website-files.com/636e894daa9e99940a604aef/66a0c396c60f181c53734c94_Add%20Solana%20to%20MetaMask%20(5).webp",
    title: "Compress Token",
    description: "Mint and receive compressed tokens via Light Protocol",
    label: "Get Compressed",
    links: {
      actions: [
        {
          label: "Get Compressed Tokens",
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
    const url = new URL(request.url);
    const amount = Number(url.searchParams.get("amount")) || 1000;
    const decimals = 9;
    const body: ActionPostRequest = await request.json();

    let user;
    try {
      user = new PublicKey(body.account); // User's public key from the request
    } catch (error) {
      return new Response("Invalid account", { status: 400, headers: ACTIONS_CORS_HEADERS });
    }

    const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=b9d5f51e-180d-4822-84f4-664cfe7c8f56";
    const connection = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

    // Generate a new mint keypair
    const mint = Keypair.generate();

    // Define token metadata
    const metadata: TokenMetadata = {
      mint: mint.publicKey,
      name: "CompressedToken",
      symbol: "CTK",
      uri: "https://example.com/token-metadata.json",
      additionalMetadata: [["createdBy", "Blink"]],
    };

    // Calculate space for mint and metadata
    const mintLen = getMintLen([ExtensionType.MetadataPointer]);
    const metadataLen = 2 + 2 + pack(metadata).length;
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

    // Get the user's ATA
    const ata = await getAssociatedTokenAddress(
      mint.publicKey,
      user,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create the transaction
    const transaction = new Transaction();

    const OUTPUT_STATE_TREE = new PublicKey("smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT");

    // Instruction 1: Create and initialize the mint
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: user,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports: mintLamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        user,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeMintInstruction(
        mint.publicKey,
        decimals,
        user,
        null,
        TOKEN_2022_PROGRAM_ID
      ),
      createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mint.publicKey,
        metadata: mint.publicKey,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        mintAuthority: user,
        updateAuthority: user,
      })
    );

    // Instruction 2: Register the mint with CompressedTokenProgram
    transaction.add(
      await CompressedTokenProgram.createTokenPool({
        feePayer: user,
        mint: mint.publicKey,
        tokenProgramId: TOKEN_2022_PROGRAM_ID,
      })
    );

    // Instruction 3: Create the user's ATA
    const accountInfo = await connection.getAccountInfo(ata);
    if (!accountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          user, // Payer
          ata, // ATA address
          user, // Owner
          mint.publicKey, // Mint
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Instruction 4: Mint SPL tokens to the user's ATA
    const tokenAmount = new BN(amount).mul(new BN(10).pow(new BN(decimals)));
    transaction.add(
      createMintToInstruction(
        mint.publicKey,
        ata,
        user,
        amount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

  
    // Before adding the compress instruction:
console.log("Compress instruction parameters:", {
  payer: user.toBase58(),
  owner: user.toBase58(),
  source: ata.toBase58(),
  toAddress: user.toBase58(),
  mint: mint.publicKey.toBase58(),
  amount: tokenAmount.toString(),
  outputStateTree: OUTPUT_STATE_TREE.toBase58()
});

try {
  const compressIx = await CompressedTokenProgram.compress({
    payer: user,
    owner: user,
    source: ata,
    toAddress: user,
    mint: mint.publicKey,
    amount: tokenAmount,
    outputStateTree: OUTPUT_STATE_TREE,
    tokenProgramId: TOKEN_2022_PROGRAM_ID
  });
  
  transaction.add(compressIx);
} catch (error) {
  console.error("Error creating compress instruction:", error);
  throw error;
}

    

    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = user;

    // Partial sign with the mint keypair
    transaction.partialSign(mint);

    // Serialize and return the transaction
    const response = await createPostResponse({
      fields: {
        transaction: transaction,
        type: "transaction",
      },
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Error in POST:", error);
    return new Response(`Error: ${error}`, { status: 500, headers: ACTIONS_CORS_HEADERS });
  }
}