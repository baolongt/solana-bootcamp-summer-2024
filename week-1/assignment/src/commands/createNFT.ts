import { TransactionInstruction } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { Metaplex, bundlrStorage, keypairIdentity } from "@metaplex-foundation/js";

import { payer, connection } from "../lib/vars";
import { explorerURL, printConsoleSeparator } from "../lib/helpers";

export const createNFT = async (): Promise<void> => {
    const metadata = {
        name: "Some random NFT",
        symbol: "RANDOM",
        description: "Solana Bootcamp Summer 2024 NFT collection",
        image: "https://jollycontrarian.com/images/6/6c/Rickroll.jpg",
    };


    // create an instance of Metaplex sdk for use
    const metaplex = Metaplex.make(connection)
        // set our keypair to use, and pay for the transaction
        .use(keypairIdentity(payer))
        // define a storage mechanism to upload with
        .use(
            bundlrStorage({
                address: "https://devnet.bundlr.network",
                providerUrl: "https://api.devnet.solana.com",
                timeout: 60000,
            }),
        );

    // upload the JSON metadata
    const { uri } = await metaplex.nfts().uploadMetadata(metadata);

    console.log("Metadata uploaded:", uri);

    printConsoleSeparator("NFT details");


    const tokenMint = Keypair.generate();

    // create a new nft using the metaplex sdk
    const { nft, response } = await metaplex.nfts().create({
        uri,
        name: metadata.name,
        symbol: metadata.symbol,
        useNewMint: tokenMint,

        // `sellerFeeBasisPoints` is the royalty that you can define on nft
        sellerFeeBasisPoints: 1000,

        //
        isMutable: true,
    });

    console.log(nft);

    printConsoleSeparator("NFT created:");
    console.log(explorerURL({ txSignature: response.signature }));

    /**
     *
     */

    printConsoleSeparator("Find by mint:");

    // you can also use the metaplex sdk to retrieve info about the NFT's mint
    const mintInfo = await metaplex.nfts().findByMint({
        mintAddress: tokenMint.publicKey,
    });
    console.log(mintInfo);

}