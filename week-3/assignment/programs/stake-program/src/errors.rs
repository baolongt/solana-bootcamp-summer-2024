use anchor_lang::prelude::*;

#[error_code]
pub enum AppError {
    #[msg("Tokens are already staked")]
    IsStaked,

    #[msg("Tokens are not staked")]
    NotStaked,

    #[msg("No tokens to stake")]
    NoToken,

    #[msg("Staker is not the owner of the stake information")]
    NotOwner,

    #[msg("Unstake amount is less than the staked amount")]
    UnstakeMoreThanStaked,
}
