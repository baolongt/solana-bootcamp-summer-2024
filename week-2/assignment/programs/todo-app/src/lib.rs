use anchor_lang::prelude::*;
use constant::*;
use error::AppError;
use state::{ Profile, Todo };

declare_id!("6yqnmGWqYe159aJsA6RKxYHQ2arhuTLJJ8D6QTH3dYK");

mod constant;
mod error;
mod state;

#[program]
pub mod todo_app {
    use super::*;

    pub fn create_profile(ctx: Context<CreateProfile>, name: String) -> Result<()> {
        require!(name.len() <= 100, AppError::NameTooLong);

        let key = ctx.accounts.profile.key();

        let profile = &mut ctx.accounts.profile;

        profile.key = key;
        profile.name = name;
        profile.authority = ctx.accounts.creator.key();
        profile.todo_count = 0;

        Ok(())
    }

    pub fn create_todo(ctx: Context<CreateTodo>, content: String) -> Result<()> {
        if content.len() > 200 {
            return err!(AppError::ContentTooLong);
        }

        let profile = &mut ctx.accounts.profile;

        let todo = &mut ctx.accounts.todo;

        todo.content = content;
        todo.profile = profile.key();
        todo.completed = false;

        profile.todo_count += 1;

        Ok(())
    }

    pub fn toggle_todo(_ctx: Context<ToggleTodo>) -> Result<()> {
        let profile = &mut _ctx.accounts.profile;
        let todo = &mut _ctx.accounts.todo;

        if todo.profile != profile.key() {
            return err!(AppError::InvalidAuthority);
        }
        let current_state = todo.completed;
        todo.completed = !current_state;
        Ok(())
    }

    pub fn delete_todo(ctx: Context<DeleteTodo>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        let todo = &mut ctx.accounts.todo;

        if todo.profile != profile.key() {
            return err!(AppError::InvalidAuthority);
        }

        profile.todo_count -= 1;

        let lamport_des: AccountInfo = profile.to_account_info();
        let _ = ctx.accounts.todo.close(lamport_des);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 /* account discriminator */ + Profile::SPACE,
        seeds = [PROFILE_SEED, creator.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, Profile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateTodo<'info> {
    #[account(mut)]
    creator: Signer<'info>,

    #[account(mut, 
        // has_one = authority
        constraint = profile.authority == creator.key() @ AppError::InvalidAuthority
    )]
    profile: Account<'info, Profile>,

    #[account(
        init,
        payer = creator,
        space = 8 + Todo::INIT_SPACE,
        seeds = [TODO_SEED, profile.key().as_ref(), profile.todo_count.to_le_bytes().as_ref()],
        bump
    )]
    todo: Account<'info, Todo>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ToggleTodo<'info> {
    #[account(mut)]
    creator: Signer<'info>,

    #[account(mut, 
        // has_one = authority
        constraint = profile.authority == creator.key() @ AppError::InvalidAuthority
    )]
    profile: Account<'info, Profile>,

    #[account(mut,  constraint = todo.profile == profile.key() @ AppError::InvalidAuthority)]
    todo: Account<'info, Todo>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteTodo<'info> {
    #[account(mut)]
    creator: Signer<'info>,

    #[account(mut,
        // has_one = authority
        constraint = profile.authority == creator.key() @ AppError::InvalidAuthority
    )]
    profile: Account<'info, Profile>,

    #[account(mut,  constraint = todo.profile == profile.key() @ AppError::InvalidAuthority)]
    todo: Account<'info, Todo>,

    system_program: Program<'info, System>,
}
