# Publishing the AyFlux GitHub Wiki

The source-controlled Wiki drafts are in [`wiki/`](../wiki/). They can be reviewed through ordinary GitHub pull requests and kept aligned with the README and roadmap.

**Important:** GitHub stores the live Wiki as a separate Git repository. Committing these Markdown files to `main/wiki/` does not automatically publish or synchronize the Wiki tab.

## One-time setup

1. In the repository's **Settings → General → Features**, enable **Wikis** if the option is available.
2. Open the **Wiki** tab and create its first page (titled `Home`).
3. Clone the wiki repository in a local terminal:

   ```bash
   git clone https://github.com/khalilm3264/acyclovirpksim.wiki.git
   ```

4. Copy `wiki/Home.md`, `wiki/Roadmap.md`, `wiki/Release-Plan.md` and `wiki/_Sidebar.md` from the main repository into the root of the cloned wiki.
5. In the cloned wiki, commit and push:

   ```bash
   git add Home.md Roadmap.md Release-Plan.md _Sidebar.md
   git commit -m "Publish AyFlux roadmap and wiki navigation"
   git push
   ```

If `git clone` reports the Wiki repository does not exist, confirm the Wiki feature is enabled and the first Wiki page was saved. Publishing requires normal GitHub write access.

## Maintenance

Edit the `wiki/` drafts in this repository for review, then sync approved changes into the separate Wiki repository. Keep milestone language aspirational, clearly distinguish available features from proposals, and avoid claiming clinical validation.

Public Wiki (after publication): https://github.com/khalilm3264/acyclovirpksim/wiki
