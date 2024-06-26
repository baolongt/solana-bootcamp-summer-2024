import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TodoApp } from "../target/types/todo_app";
import { assert, expect } from "chai";
import { withErrorTest } from "./utils";

describe("toggle todo", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.TodoApp as Program<TodoApp>;

    let profile: anchor.web3.PublicKey;

    before(async () => {
        [profile] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("profile"), provider.publicKey.toBytes()],
            program.programId
        );

        console.log("profile", profile.toBase58());
    });

    it("Toggle todo index 0 successfully", async () => {
        let profileAccount = await program.account.profile.fetch(profile);
        const currentTodoCount = 9;

        const [todo] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("todo"), profile.toBytes(), Buffer.from([currentTodoCount])],
            program.programId
        );

        const currentStateAccount = await program.account.todo.fetch(todo);
        console.log("Current state", currentStateAccount);
        const tx = await program.methods
            .toggleTodo()
            .accounts({
                creator: provider.publicKey,
                profile,
                todo,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        console.log("Your transaction signature", tx);
        const todoAccount = await program.account.todo.fetch(todo);
        console.log("New state", todoAccount);
        expect(todoAccount.completed).to.equal(!currentStateAccount.completed);
    });

    it("Toggle other's todo failed by providing invalid creator", async () => {

        const anotherPayer = anchor.web3.Keypair.generate();

        console.log("anotherPayer", anotherPayer.publicKey.toBase58());


        withErrorTest(async () => {
            try {
                let profileAccount = await program.account.profile.fetch(profile);
                const currentTodoCount = 0;

                const [todo] = anchor.web3.PublicKey.findProgramAddressSync(
                    [Buffer.from("todo"), profile.toBytes(), Buffer.from([currentTodoCount])],
                    program.programId
                );

                const currentStateAccount = await program.account.todo.fetch(todo);
                console.log("Current state", currentStateAccount);
                const tx = await program.rpc
                    .toggleTodo({
                        accounts: {
                            creator: anotherPayer.publicKey,
                            profile,
                            todo,
                            systemProgram: anchor.web3.SystemProgram.programId,
                        },
                        signers: [anotherPayer]
                    });

                console.log("Your transaction signature", tx);
                const todoAccount = await program.account.todo.fetch(todo);
                console.log("New state", todoAccount);
                expect(todoAccount.completed).to.equal(!currentStateAccount.completed);
            }
            catch (error) {
                assert.isTrue(error instanceof anchor.AnchorError);
                const err: anchor.AnchorError = error;
                assert.strictEqual(err.error.errorMessage, "Invalid authority");
                assert.strictEqual(err.error.errorCode.number, 6002);
                assert.strictEqual(err.error.errorCode.code, "InvalidAuthority");
                assert.strictEqual(
                    err.program.toString(),
                    program.programId.toString()
                );
            }
        })
    });

})