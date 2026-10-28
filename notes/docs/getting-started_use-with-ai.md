# Use These Docs with AI

These docs are built to be read by AI tools as well as people. Every page has a plain-markdown mirror, and the whole site is indexed for language models. Both are live today.

**Which option should you use?**

| You are | Use |
| --- | --- |
| Asking questions about one page | [Open the page in your assistant](/docs/getting-started/use-with-ai#ask-an-assistant-about-one-page) |
| Feeding the docs to your own tool, agent, or evaluation | [The site indexes](/docs/getting-started/use-with-ai#give-a-model-the-whole-site), never scrape the HTML |

## Ask an assistant about one page

Every page on this site has a markdown mirror: add `.md` to the end of the page URL.

**What it does.** Gives an AI assistant the clean content of a page, structure and code blocks preserved, navigation noise removed.

**When to use it.** Quick questions, code generation, or a longer analysis grounded in a single page.

**How to use it.** Tell your assistant to read the page's `.md` URL:

* **Claude:** `https://claude.ai/new?q=Read <page URL>.md so I can ask questions about it.`
* **ChatGPT:** `https://chatgpt.com/?q=Read <page URL>.md so I can ask questions about it.`

For example, to work with the [QuipSwap](/docs/quip-interlock-protocol/quipswap) page, copy the page's address from your browser and add `.md` to the end. The [`/llms.txt` index](/docs/getting-started/use-with-ai#give-a-model-the-whole-site) lists the exact mirror URL for every page.

## Give a model the whole site

**What it does.** Two standing indexes cover the entire documentation at once.

| URL | Contents |
| --- | --- |
| [`/llms.txt`](https://developers.quip.network/docs/llms.txt) | An annotated index of every page with its markdown mirror, for models that fetch pages on demand |
| [`/llms-full.txt`](https://developers.quip.network/docs/llms-full.txt) | The entire documentation in one markdown file, for pasting into a model's context window |

**When to use it.** You are building a tool, agent, or evaluation that consumes the docs as data.

**How to use it.** Fetch the index URL directly. Use these rather than scraping the HTML: they are generated from the same source as the site, so they are always current.

> **Note**
> These endpoints reflect the published documentation. If a page is not on the live site yet, it is not in the indexes.
