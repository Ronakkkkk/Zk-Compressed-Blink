#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("AsjZ3kWAUSQRNt2pZVeJkywhZ6gpLpHZmJjduPmKZDZZ");

#[program]
pub mod Compressed_blink {
    use super::*;

  pub fn close(_ctx: Context<CloseCompressedBlink>) -> Result<()> {
    Ok(())
  }

  pub fn decrement(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.Compressed_blink.count = ctx.accounts.Compressed_blink.count.checked_sub(1).unwrap();
    Ok(())
  }

  pub fn increment(ctx: Context<Update>) -> Result<()> {
    ctx.accounts.Compressed_blink.count = ctx.accounts.Compressed_blink.count.checked_add(1).unwrap();
    Ok(())
  }

  pub fn initialize(_ctx: Context<InitializeCompressedBlink>) -> Result<()> {
    Ok(())
  }

  pub fn set(ctx: Context<Update>, value: u8) -> Result<()> {
    ctx.accounts.Compressed_blink.count = value.clone();
    Ok(())
  }
}

#[derive(Accounts)]
pub struct InitializeCompressedBlink<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  init,
  space = 8 + CompressedBlink::INIT_SPACE,
  payer = payer
  )]
  pub Compressed_blink: Account<'info, CompressedBlink>,
  pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct CloseCompressedBlink<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
  mut,
  close = payer, // close account and return lamports to payer
  )]
  pub Compressed_blink: Account<'info, CompressedBlink>,
}

#[derive(Accounts)]
pub struct Update<'info> {
  #[account(mut)]
  pub Compressed_blink: Account<'info, CompressedBlink>,
}

#[account]
#[derive(InitSpace)]
pub struct CompressedBlink {
  count: u8,
}
