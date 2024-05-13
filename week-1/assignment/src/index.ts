import { createNFT } from "./commands/createNFT";
import { createToken } from "./commands/createToken";

const main = async () => {
    await createToken();
    await createNFT();
};

main();