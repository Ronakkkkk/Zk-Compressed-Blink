import * as anchor from '@coral-xyz/anchor'
import {Program} from '@coral-xyz/anchor'
import {Keypair} from '@solana/web3.js'
import {CompressedBlink} from '../target/types/Compressed_blink'

describe('Compressed_blink', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.CompressedBlink as Program<CompressedBlink>

  const Compressed_blinkKeypair = Keypair.generate()

  it('Initialize CompressedBlink', async () => {
    await program.methods
      .initialize()
      .accounts({
        Compressed_blink: Compressed_blinkKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([Compressed_blinkKeypair])
      .rpc()

    const currentCount = await program.account.Compressed_blink.fetch(Compressed_blinkKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment CompressedBlink', async () => {
    await program.methods.increment().accounts({ Compressed_blink: Compressed_blinkKeypair.publicKey }).rpc()

    const currentCount = await program.account.Compressed_blink.fetch(Compressed_blinkKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment CompressedBlink Again', async () => {
    await program.methods.increment().accounts({ Compressed_blink: Compressed_blinkKeypair.publicKey }).rpc()

    const currentCount = await program.account.Compressed_blink.fetch(Compressed_blinkKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement CompressedBlink', async () => {
    await program.methods.decrement().accounts({ Compressed_blink: Compressed_blinkKeypair.publicKey }).rpc()

    const currentCount = await program.account.Compressed_blink.fetch(Compressed_blinkKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set Compressed_blink value', async () => {
    await program.methods.set(42).accounts({ Compressed_blink: Compressed_blinkKeypair.publicKey }).rpc()

    const currentCount = await program.account.Compressed_blink.fetch(Compressed_blinkKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the Compressed_blink account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        Compressed_blink: Compressed_blinkKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.Compressed_blink.fetchNullable(Compressed_blinkKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
