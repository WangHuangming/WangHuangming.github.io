# Huangming Wang — Personal Homepage

A static English/Chinese personal homepage for Huangming Wang, an LLM application engineer. It presents selected projects, experience, education, a résumé download, and contact links. English is the default; the language switch remembers a visitor's choice in local storage.

The original GitHub Pages repository is [WangHuangming/WangHuangming.github.io](https://github.com/WangHuangming/WangHuangming.github.io), with the site address [wanghuangming.github.io](https://wanghuangming.github.io/). The site uses plain HTML, CSS, and JavaScript with no backend or runtime dependencies.

## Local preview

With Node.js available, run:

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. No dependency installation is required for previewing the site: `tools/serve.mjs` uses only Node.js built-in modules.

## Publishing

Pushes to `main` run the GitHub Pages workflow. It runs `npm run build` without installing dependencies and publishes only the generated `_site/` directory. The build gives CSS, JavaScript, images, and the résumé content-based filenames and updates the published HTML references. Changed files receive new URLs, preventing a new page from reusing an older cached stylesheet or script. Original public filenames are also retained for visitors with cached HTML from before this change.

Local preview continues to use the editable source files directly. Do not edit or commit `_site/`; it is regenerated on every build.

## Tests

Playwright is a development dependency used for browser tests. It is optional for serving or publishing the homepage.

```sh
npm install
npx playwright install chromium
npm test
```

To use an existing Chromium executable instead of downloading Playwright's browser, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute path before running `npm test`.

## Files

- `index.html`: homepage content, including paired `data-en` and `data-zh` translations.
- `styles.css`: responsive layout and visual styles.
- `script.js`: language switching, mobile navigation, and email copying.
- `images/`: portrait and visual assets.
- `assets/Huangming_Wang_Resume.pdf`: downloadable English résumé.
- `tools/serve.mjs`: local preview server.
- `tools/build.mjs`: dependency-free production packaging and asset versioning.
- `tests/`: automated checks.

The `images/ambient-*.svg` files are decorative AI concept sketches, each used in one background placement. They cover embeddings, neural networks, attention, optimization, retrieval, agent loops, decision trees, learning curves, knowledge graphs, tokenization, and positional encoding (the latter appears in the stacked mobile hero). Curves and weights illustrate concepts; they are not measured project results. Keep their notation language-neutral, their placements distinct, and their contrast below the main content.

## Résumé source and content maintenance

Use `F:\Projects\Agent_CV\output` as the persistent source of truth for future résumé facts. Before changing experience, education, project claims, skills, or contact information:

1. Find the actual résumé files under that directory and compare the modification times of the PDF, LaTeX, and DOCX versions. Do not choose interview preparation notes or rendered page images as résumé authorities.
2. Read the newest actual résumé and reconcile any differences between its source and exported versions. Do not assume the DOCX is current just because it is editable.
3. Update both English and Chinese text in `index.html`, keeping the initial visible English text consistent with `data-en`. Update related page metadata and labels where needed.
4. Replace `assets/Huangming_Wang_Resume.pdf` with the matching current résumé PDF so the page and download reflect the same version. If a newer source has no matching PDF, resolve that mismatch before presenting the download as current.
5. Run the tests and inspect both languages at desktop and mobile sizes.

At the 2026-10-12 review, the current factual source was:

- `F:\Projects\Agent_CV\output\latex\Huangming_Wang_LLM_Application_Engineer_Resume.tex` — updated 2026-09-16.
- `F:\Projects\Agent_CV\output\pdf\Huangming_Wang_LLM_Application_Engineer_Resume.pdf` — updated 2026-09-16, with matching résumé content.

The DOCX at `F:\Projects\Agent_CV\output\word\Huangming_Wang_LLM_Application_Engineer_Resume.docx` was last updated 2026-07-13 and is stale. In particular, it lists Columbus, OH; the newer source lists Chandler, AZ and includes the RAG Wiki and Game Companion work.

Preserve qualifications from the source: the stated 2+ years combine internships and projects; Game Companion is in development; its 273 offline tests are a résumé snapshot, not a continuously verified count. Do not invent project repository links, performance metrics, or a Chinese spelling of the name.

The homepage omits the phone number and provides email, GitHub, and LinkedIn contact links. The downloadable original PDF retains its original contact information, including the phone number.

Updates are manual. There is no automatic or scheduled résumé synchronization. Editing or testing locally does not publish the site; publication follows the repository's configured GitHub Pages workflow.
