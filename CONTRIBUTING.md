# Contributing to the Package Daddy Catalog

Hell yeah, help is welcome. This catalog either grows with the MO2 community
or it turns into some tiny private list only one person can fix, and nobody
wants that.

## Submit through Package Daddy

Use **Suggest catalog change** or **Catalog comments** in Package Daddy. The
form checks IDs, official links, dates, duplicate records, structured
compatibility claims, and known conflicts before it submits anything. A valid
submission is committed straight to the shared catalog by the publisher; there
is no pull-request graveyard to babysit.

Useful submissions include a missing MO2 plugin/tool/theme, a stale official
link or release fact, and a compatibility fact tied to an MO2 version. Bring
an official project page or other evidence. Screenshots are fine support, but
a source people can check later is better.

## Safety rules, because apparently we need them

- No direct downloads from random mirrors, file hosts, or link shorteners.
- A Nexus page is metadata, not a blessing. It is not proof a file is safe to
  auto-install.
- A public submission can list a package and add sourced notes. It cannot
  promote a package to a verified/auto-installable state.
- Do not use archive filenames as release dates. They lie. A lot.
- Comments are structured catalog facts, not a public chat box. Add the
  affected package, the relationship/conflict, and evidence.
- Do not include API keys, tokens, passwords, private URLs, or harassment.
  That garbage gets rejected before it reaches the catalog.

The JSON schema at `catalog/submission-schema.json` is the shared contract for
Daddy and the publisher. If you hack locally, keep unrelated reformatting out
of a change. It makes diffing suck.
