// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import CompressedBlinkIDL from '../target/idl/Compressed_blink.json'
import type { CompressedBlink } from '../target/types/Compressed_blink'

// Re-export the generated IDL and type
export { CompressedBlink, CompressedBlinkIDL }

// The programId is imported from the program IDL.
export const COMPRESSED_BLINK_PROGRAM_ID = new PublicKey(CompressedBlinkIDL.address)

// This is a helper function to get the CompressedBlink Anchor program.
export function getCompressedBlinkProgram(provider: AnchorProvider) {
  return new Program(CompressedBlinkIDL as CompressedBlink, provider)
}

// This is a helper function to get the program ID for the CompressedBlink program depending on the cluster.
export function getCompressedBlinkProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the CompressedBlink program on devnet and testnet.
      return new PublicKey('CounNZdmsQmWh7uVngV9FXW2dZ6zAgbJyYsvBpqbykg')
    case 'mainnet-beta':
    default:
      return COMPRESSED_BLINK_PROGRAM_ID
  }
}
