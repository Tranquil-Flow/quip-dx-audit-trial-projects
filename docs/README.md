# Repository Documentation

This folder contains high-level documentation for our repositories. Each file documents a single repository.

General Documentation links and websites:
* https://developers.quip.network/docs - Published docs site
* https://gitlab.com/piqued/gitbook - the git repo backing the published docs site.
* https://quip.network/ - the website
* https://quip.locker/ and https://vault.quip.network/ - the smart wallet app
* https://quantumdoomclock.com/ - QDC newsletter site
* [TODO: add others as needed]


## File Naming Convention

Each documentation file should be named after the repository it describes:

```
{repository-name}.md
```

For example, a repository named `hashsigs-rs` would have a documentation file named `hashsigs-rs.md`.

## Document Format

Each documentation file should follow this structure:

### Header Table

Start with a level-1 heading (the repository name) followed by a metadata table:

```markdown
# repository-name

| Field | Value |
|-------|-------|
| **Clone** | `git clone git@gitlab.com:org/repository-name.git` |
| **URL** | https://gitlab.com/org/repository-name |

## Description

A high-level description of what this repository does...
```

### Required Fields

| Field | Description |
|-------|-------------|
| **Clone** | The git clone command (SSH format preferred) |
| **URL** | Direct link to the repository on GitLab |

### Description Section

The `## Description` section should contain a high-level overview of:
- What the repository does
- Its primary purpose
- Key functionality

Keep descriptions concise but informative. Avoid implementation details.

## Adding New Documentation

1. Create a new file named `{repository-name}.md`
2. Copy the header table template above
3. Fill in the Clone and URL fields with the correct GitLab paths
4. Write a high-level description of the repository

## Example

See below for a complete example:

```markdown
# hashsigs-rs

| Field | Value |
|-------|-------|
| **Clone** | `git clone git@gitlab.com:piqued/hashsigs-rs.git` |
| **URL** | https://gitlab.com/piqued/hashsigs-rs |

## Description

A Rust implementation of WOTS+ (Winternitz One-Time Signature) scheme, with Solana program support.
```

NOTE: Automation (LLM generation) is totally encouraged but PLEASE do your best to make sure it's concise and accurate. The whole point of this is to save people time. If you run across something that is not doing it, highlight it so we can fix it. 