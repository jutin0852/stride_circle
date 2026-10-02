# Authentication

## Sub-features

- Sign in with email and password.
- Create an account with a display name, email, and password.
- Start Google sign-in when OAuth values are configured.
- Switch between sign-in and sign-up modes.

## How to get to it (user POV)

Launch the app while signed out. Expo Router opens `/sign-in`.

## Driving it with browser automation

Assert `Welcome back`, `Email address`, `Password`, and `Sign in`. Select `New to Stride Circle? Create an account`, then assert `Create your account` and `Your name`. With Firebase configured, submit valid test credentials and assert navigation to the Home tab.

## Gotchas

The current checkout has no `.env`, so the form and mode switch are reachable but Firebase submission is intentionally blocked. Google sign-in also needs all three Google client IDs.

