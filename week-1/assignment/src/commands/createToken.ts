import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { payer, connection } from "../lib/vars";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMint2Instruction, createMintToInstruction, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

import {
    PROGRAM_ID as METADATA_PROGRAM_ID,
    createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { getSigners } from "../lib/getSinger";


const buildCreateAndSendTokenIx = async (mintKeypair: Keypair): Promise<TransactionInstruction[]> => {
    console.log("Payer address:", payer.publicKey.toBase58());

    // generate a new keypair to be used for our mint
    console.log("Mint address:", mintKeypair.publicKey.toBase58());

    const tokenConfig = {
        // define how many decimals we want our tokens to have
        decimals: 6,
        //
        name: "Long Tran Token",
        //
        symbol: "LTT",
        //
        uri: "https://jollycontrarian.com/images/6/6c/Rickroll.jpg",
    };
    console.log("create min account");
    const createMintAccountIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        // the `space` required for a token mint is accessible in the `@solana/spl-token` sdk
        space: MINT_SIZE,
        // store enough lamports needed for our `space` to be rent exempt
        lamports: await connection.getMinimumBalanceForRentExemption(MINT_SIZE),
        // tokens are owned by the "token program"
        programId: TOKEN_PROGRAM_ID,
    });
    console.log("created");


    // Initialize that account as a Mint
    const initializeMintIx = createInitializeMint2Instruction(
        mintKeypair.publicKey,
        tokenConfig.decimals,
        payer.publicKey,
        payer.publicKey,
    );

    const metadataAccount = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
        METADATA_PROGRAM_ID,
    )[0];

    const createMetadataIx = createCreateMetadataAccountV3Instruction(
        {
            metadata: metadataAccount,
            mint: mintKeypair.publicKey,
            mintAuthority: payer.publicKey,
            payer: payer.publicKey,
            updateAuthority: payer.publicKey,
        },
        {
            createMetadataAccountArgsV3: {
                data: {
                    creators: null,
                    name: tokenConfig.name,
                    symbol: tokenConfig.symbol,
                    uri: tokenConfig.uri,
                    sellerFeeBasisPoints: 0,
                    collection: null,
                    uses: null,
                },
                // `collectionDetails` - for non-nft type tokens, normally set to `null` to not have a value set
                collectionDetails: null,
                // should the metadata be updatable?
                isMutable: true,
            },
        },
    );

    return [
        createMintAccountIx,
        initializeMintIx,
        createMetadataIx,

    ]
};

const sendToken = async (mintKeypair: Keypair): Promise<TransactionInstruction[]> => {
    console.log("transfer token to my account ");
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintKeypair.publicKey,
        payer.publicKey,

    ).then(ata => ata.address);
    const ONE_TOKEN = 1_000_000; // 1 * 10**6

    // MINT 100 to my account account
    const [authorityPublicKey, signers] = getSigners(payer, []);

    const mint100TokenIx = createMintToInstruction(
        mintKeypair.publicKey,
        tokenAccount,
        authorityPublicKey,
        ONE_TOKEN * 100,
        signers, // multi signers
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') // SPL Token program account
    )

    console.log("transfer token to 63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs ");
    // MINT 10 to 63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs account
    const received10TokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintKeypair.publicKey,
        new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs"),

    ).then(ata => ata.address);

    const mint10TokenIx = createMintToInstruction(
        mintKeypair.publicKey,
        received10TokenAccount,
        authorityPublicKey,
        ONE_TOKEN * 10,
        signers, // multi signers,
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') // SPL Token program account
    )


    console.log("Token account address:", mintKeypair.publicKey.toBase58());

    return [
        mint100TokenIx,
        mint10TokenIx
    ]
}



export const createToken = async () => {
    const mintKeypair = Keypair.generate();

    const instructions = await buildCreateAndSendTokenIx(mintKeypair);

    const transaction = new Transaction();
    transaction.add(...instructions);

    const signature = await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
    console.log("Transaction signature:", signature);

    const sendTokenInstructions = await sendToken(mintKeypair);
    const sendTokenTransaction = new Transaction();
    sendTokenTransaction.add(...sendTokenInstructions);
    const send_signature = await sendAndConfirmTransaction(connection, sendTokenTransaction, [payer, mintKeypair]);
    console.log("Transaction signature:", send_signature);
}