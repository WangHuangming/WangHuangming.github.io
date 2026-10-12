# Repository guidance

## Personal résumé source

The user's designated source for current résumé information is:

`F:\Projects\Agent_CV\output`

For future biography, experience, education, project, skill, or contact updates, read the newest actual résumé there. Compare the PDF, LaTeX, and DOCX modification times and reconcile their content. Interview preparation notes and rendered page images are not the factual authority. The detailed source snapshot and update procedure are in `README.md`.

Update the English and Chinese versions together, including visible text, metadata, and accessibility labels. Keep the downloadable `assets/Huangming_Wang_Resume.pdf` aligned with the résumé used for the page. Preserve source qualifications such as “in development”; do not invent metrics, project links, or a Chinese spelling of the name.

## Website

This is a plain HTML/CSS/JavaScript GitHub Pages site. Keep the presentation light, simple, and personable, with substantive project information. English is the initial language; visitors can switch to Chinese and their preference is remembered.

For background decoration, the user prefers diagrams related to AI principles (such as vector spaces, neural connections, and attention matrices), partly cropped beyond the page edges and softly faded behind the content. Keep enough of the structure visible to recognize the principle: multiple connected neuron layers, point clusters and axes, or several matrix rows and columns. Avoid excessive enlargement/cropping that reduces a diagram to disconnected fragments, and avoid isolated little illustrations or labeled decorative stickers in the margins.

`npm run dev` starts the dependency-free preview. `npm test` runs Playwright browser checks after installing development dependencies. Inspect both languages at desktop and mobile widths when changing layout or copy.

Distribute background diagrams along both margins throughout the page, with a little more density and visibility than sparse, very pale single motifs. Preserve their current recognizable scale rather than enlarging them to fill gaps; keep the central reading area quiet.

The current diagram density is accepted. Each placement should show a different AI concept rather than repeating the same SVG. Include meaningful secondary detail (data flow, intermediate steps, mathematical notation, local plots) so the backgrounds reward a closer look, while keeping their linework subdued. Use language-neutral symbols in decorative diagrams and do not mirror diagrams containing notation.
