import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { StakeProgram } from "../target/types/stake_program";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToInstruction,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import { BN } from "bn.js";
import { loadKeypairFromFile } from "./lib/helper";

describe("stake-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.StakeProgram as Program<StakeProgram>;

  console.log("get staker pubkey");

  const staker = loadKeypairFromFile();
  let stakerTokenUSDCAccount: anchor.web3.PublicKey;
  let stakerTokenDAIAccount: anchor.web3.PublicKey;

  console.log("Staker pubkey", staker.publicKey.toBase58());

  // USDC-fake mint
  const usdcMintKp = anchor.web3.Keypair.generate();
  const daiMintKp = anchor.web3.Keypair.generate();
  let rewardUSDCVault: anchor.web3.PublicKey;
  let rewardDAIVault: anchor.web3.PublicKey;
  let stakeUSDCInfo: anchor.web3.PublicKey;
  let stakeDAIInfo: anchor.web3.PublicKey;

  console.log("USDC mint pubkey", usdcMintKp.publicKey.toBase58());
  console.log("DAI mint pubkey", daiMintKp.publicKey.toBase58());

  before(async () => {
    // init staker
    // create USDC-fake mint
    {

      const lamports = await getMinimumBalanceForRentExemptMint(
        provider.connection
      );

      const createMintUSDCIx = anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: usdcMintKp.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      });

      const createMintDaiIx = anchor.web3.SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: daiMintKp.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      });


      const initMintUSDCIx = createInitializeMint2Instruction(
        usdcMintKp.publicKey,
        6,
        provider.publicKey,
        provider.publicKey,
        TOKEN_PROGRAM_ID
      );

      const initMintDAIIx = createInitializeMint2Instruction(
        daiMintKp.publicKey,
        6,
        provider.publicKey,
        provider.publicKey,
        TOKEN_PROGRAM_ID
      );

      stakerTokenUSDCAccount = getAssociatedTokenAddressSync(
        usdcMintKp.publicKey,
        staker.publicKey
      );

      stakerTokenDAIAccount = getAssociatedTokenAddressSync(
        daiMintKp.publicKey,
        staker.publicKey
      );

      console.log("Staker token usdc account", stakerTokenUSDCAccount.toBase58());
      console.log("Staker token dai account", stakerTokenDAIAccount.toBase58());

      const createStakerTokenUSDCAccountIx =
        createAssociatedTokenAccountInstruction(
          staker.publicKey,
          stakerTokenUSDCAccount,
          staker.publicKey,
          usdcMintKp.publicKey
        );

      const createStakerTokenDAIAccountIx =
        createAssociatedTokenAccountInstruction(
          staker.publicKey,
          stakerTokenDAIAccount,
          staker.publicKey,
          daiMintKp.publicKey
        );

      const mintUSDCToStakerIx = createMintToInstruction(
        usdcMintKp.publicKey,
        stakerTokenUSDCAccount,
        provider.publicKey,
        1000 * 10 ** 6,
        []
      );

      const mintDAIToStakerIx = createMintToInstruction(
        daiMintKp.publicKey,
        stakerTokenDAIAccount,
        provider.publicKey,
        1000 * 10 ** 6,
        []
      );

      const txMintUSDC = new anchor.web3.Transaction();
      txMintUSDC.add(
        ...[
          createMintUSDCIx,
          initMintUSDCIx,
          createStakerTokenUSDCAccountIx,
          mintUSDCToStakerIx,

        ]
      );
      const ts = await provider.sendAndConfirm(txMintUSDC, [usdcMintKp, staker]);

      const txMintDai = new anchor.web3.Transaction();
      txMintDai.add(
        ...[
          createMintDaiIx,
          initMintDAIIx,
          createStakerTokenDAIAccountIx,
          mintDAIToStakerIx,
        ]
      );
      const ts2 = await provider.sendAndConfirm(txMintDai, [daiMintKp, staker]);
      console.log("Your transaction usdc mint signature", ts);
      console.log("Your transaction dai mint signature", ts2);
    }

    rewardUSDCVault = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward"), usdcMintKp.publicKey.toBytes()],
      program.programId
    )[0];
    rewardDAIVault = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("reward"), daiMintKp.publicKey.toBytes()],
      program.programId
    )[0];
    console.log("Reward usdc vault", rewardUSDCVault.toBase58());
    console.log("Reward dai vault", rewardDAIVault.toBase58());
  });

  it("Is USDC initialized!", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: provider.publicKey,
        rewardVault: rewardUSDCVault,
        mint: usdcMintKp.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const rewardVaultAccount = await getAccount(
      provider.connection,
      rewardUSDCVault
    );

    expect(rewardVaultAccount.address.toBase58()).to.equal(
      rewardUSDCVault.toBase58()
    );
    expect(Number(rewardVaultAccount.amount)).to.equal(0);
  });

  it("Is DAI initialized!", async () => {
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: provider.publicKey,
        rewardVault: rewardDAIVault,
        mint: daiMintKp.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const rewardVaultAccount = await getAccount(
      provider.connection,
      rewardDAIVault
    );

    expect(rewardVaultAccount.address.toBase58()).to.equal(
      rewardDAIVault.toBase58()
    );
    expect(Number(rewardVaultAccount.amount)).to.equal(0);
  });

  it("Stake USDC successfully", async () => {
    stakeUSDCInfo = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), staker.publicKey.toBytes(), usdcMintKp.publicKey.toBytes()],
      program.programId,
    )[0];
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      usdcMintKp.publicKey,
      stakeUSDCInfo,
      true
    );
    const stakeAmount = new BN(100 * 10 ** 6);

    const tx = await program.methods
      .stake(stakeAmount)
      .accounts({
        staker: staker.publicKey,
        mint: usdcMintKp.publicKey,
        stakeInfo: stakeUSDCInfo,
        vaultTokenAccount: vaultTokenAccount,
        stakerTokenAccount: stakerTokenUSDCAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);

    const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeUSDCInfo);

    expect(stakeInfoAccount.staker.toBase58()).to.equal(
      staker.publicKey.toBase58()
    );
    expect(stakeInfoAccount.mint.toBase58()).to.equal(
      usdcMintKp.publicKey.toBase58()
    );
    expect(stakeInfoAccount.isStaked).to.equal(true);
    expect(stakeInfoAccount.amount.toString()).to.equal(stakeAmount.toString());

    const stakerAccount = await getAccount(
      provider.connection,
      stakerTokenUSDCAccount
    );

    const vaultAccount = await getAccount(
      provider.connection,
      vaultTokenAccount
    );

    expect(stakerAccount.amount.toString()).to.equal(String(900 * 10 ** 6));
    expect(vaultAccount.amount.toString()).to.equal(String(100 * 10 ** 6));
  });

  it("Stake DAI successfully", async () => {
    stakeDAIInfo = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stake_info"), staker.publicKey.toBytes(), daiMintKp.publicKey.toBytes()],
      program.programId,
    )[0];
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      daiMintKp.publicKey,
      stakeDAIInfo,
      true
    );
    const stakeAmount = new BN(100 * 10 ** 6);

    const tx = await program.methods
      .stake(stakeAmount)
      .accounts({
        staker: staker.publicKey,
        mint: daiMintKp.publicKey,
        stakeInfo: stakeDAIInfo,
        vaultTokenAccount: vaultTokenAccount,
        stakerTokenAccount: stakerTokenDAIAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([staker])
      .rpc();

    console.log("Your transaction signature", tx);
    const stakeInfoAccount = await program.account.stakeInfo.fetch(stakeDAIInfo);
    expect(stakeInfoAccount.staker.toBase58()).to.equal(
      staker.publicKey.toBase58()
    );
    expect(stakeInfoAccount.mint.toBase58()).to.equal(
      daiMintKp.publicKey.toBase58()
    );
    expect(stakeInfoAccount.isStaked).to.equal(true);
    expect(stakeInfoAccount.amount.toString()).to.equal(stakeAmount.toString());
    const stakerAccount = await getAccount(
      provider.connection,
      stakerTokenDAIAccount
    );
    const vaultAccount = await getAccount(
      provider.connection,
      vaultTokenAccount
    );
    expect(stakerAccount.amount.toString()).to.equal(String(900 * 10 ** 6));
    expect(vaultAccount.amount.toString()).to.equal(String(100 * 10 ** 6));
  })



  it("Unstake usdc successfully", async () => {
    // mint reward token to reward vault
    const mintTx = new anchor.web3.Transaction();

    const mintToRewardVaultIx = createMintToInstruction(
      usdcMintKp.publicKey,
      rewardUSDCVault,
      provider.publicKey,
      1000 * 10 ** 6,
      []
    );

    mintTx.add(mintToRewardVaultIx);

    await provider.sendAndConfirm(mintTx);

    const vaultTokenAccount = getAssociatedTokenAddressSync(
      usdcMintKp.publicKey,
      stakeUSDCInfo,
      true
    );

    const stakeAmount = new BN(100 * 10 ** 6);


    const tx = await program.methods
      .unstake(stakeAmount)
      .accounts({
        staker: staker.publicKey,
        mint: usdcMintKp.publicKey,
        stakeInfo: stakeUSDCInfo,
        vaultTokenAccount: vaultTokenAccount,
        rewardVault: rewardUSDCVault,
        stakerTokenAccount: stakerTokenUSDCAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([staker])
      .rpc();
    console.log("Your transaction signature", tx);

    const rewardVaultAccount = await getAccount(
      provider.connection,
      rewardUSDCVault
    );
    const vaultAccount = await getAccount(
      provider.connection,
      vaultTokenAccount
    );
    expect(Number(vaultAccount.amount)).to.equal(0);
    expect(Number(rewardVaultAccount.amount)).to.lessThan(1000 * 10 ** 6);
  });

  it("Unstake dai fail", async () => {

    const vaultTokenAccount = getAssociatedTokenAddressSync(
      daiMintKp.publicKey,
      stakeDAIInfo,
      true
    );

    const stakeAmount = new BN(101 * 10 ** 6);

    try {
      const tx = await program.methods
        .unstake(stakeAmount)
        .accounts({
          staker: staker.publicKey,
          mint: daiMintKp.publicKey,
          stakeInfo: stakeDAIInfo,
          vaultTokenAccount: vaultTokenAccount,
          rewardVault: rewardDAIVault,
          stakerTokenAccount: stakerTokenDAIAccount,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([staker])
        .rpc();
    }
    catch (e) {
      expect(e).to.be.an('error');
      expect(e.error.errorMessage).to.equal("Unstake amount is less than the staked amount");
    }
  })

  it("Unstake dai successfully", async () => {
    // mint reward token to reward vault
    const mintTx = new anchor.web3.Transaction();

    const mintToRewardVaultIx = createMintToInstruction(
      daiMintKp.publicKey,
      rewardDAIVault,
      provider.publicKey,
      1000 * 10 ** 6,
      []
    );

    mintTx.add(mintToRewardVaultIx);

    await provider.sendAndConfirm(mintTx);

    const vaultTokenAccount = getAssociatedTokenAddressSync(
      daiMintKp.publicKey,
      stakeDAIInfo,
      true
    );

    const stakeAmount = new BN(10 * 10 ** 6);

    const tx = await program.methods
      .unstake(stakeAmount)
      .accounts({
        staker: staker.publicKey,
        mint: daiMintKp.publicKey,
        stakeInfo: stakeDAIInfo,
        vaultTokenAccount: vaultTokenAccount,
        rewardVault: rewardDAIVault,
        stakerTokenAccount: stakerTokenDAIAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([staker])
      .rpc();
    console.log("Your transaction signature", tx);
    const rewardVaultAccount = await getAccount(
      provider.connection,
      rewardDAIVault
    );
    const vaultAccount = await getAccount(
      provider.connection,
      vaultTokenAccount
    );
    expect(Number(vaultAccount.amount)).to.equal(90 * 10 ** 6);
    expect(Number(rewardVaultAccount.amount)).to.lessThan(2000 * 10 ** 6);
  })


});
