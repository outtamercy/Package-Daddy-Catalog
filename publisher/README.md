# Package Daddy catalog publisher

This Cloudflare Worker is the boring grown-up in the room. Package Daddy does
the first-pass form review on the user's machine; this Worker repeats the
important checks, identifies the submitting GitHub account, and commits one
safe catalog edit directly to `main` using the repository-scoped GitHub App.
No PR queue. No client-side maintainer token. No raw write access for random
people on the internet.

## What it accepts

`POST /v1/submissions` with:

- `Authorization: Bearer <GitHub App user token>` from Daddy's device login;
- a body matching `../catalog/submission-schema.json`;
- a `passed-local-review` receipt.

New public records are deliberately saved as `unknown`. The form can add
official links and a sourced structured note, but it cannot give itself a
green check or an install blessing. Existing verified state is never silently
downgraded or promoted by a community form.

## Secrets

After deployment, add these in the Cloudflare Worker settings as **Secrets**:

| Secret | Where it comes from |
| --- | --- |
| `GITHUB_APP_ID` | GitHub App General page |
| `GITHUB_APP_PRIVATE_KEY` | the `.pem` generated for the GitHub App |

The private key stays in Cloudflare's encrypted secret store. It never goes in
this repository, the desktop plugin, a catalog JSON file, or chat.

## Deployment

Install Wrangler locally, authenticate it to the Cloudflare account, then:

```text
cd publisher
npx wrangler deploy
```

Once Cloudflare gives the Worker URL, add it to Daddy's publisher settings and
enable **Device Flow** in the App's Advanced settings. Daddy uses Device Flow
because it is a desktop app, so this publisher does not need a browser callback
or a second OAuth secret.
