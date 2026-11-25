# Soumyadeep Dhar: personal academic site

A hand-built, dependency-free static site (HTML + CSS + a little JS), published with **GitHub Pages** at
<https://sdhar1602.github.io>.

- **Design**: warm "paper & ink" editorial look, Stanford-cardinal accent, *Instrument Serif* + *Geist* type.
  The signature motif is the **arch**, after the sandstone arcades of Stanford's Main Quad.
- **Light / dark mode**: follows the visitor's system setting by default; the switch in the header
  remembers their choice. Toggling plays a circular "ink spill" transition in supporting browsers.
- **Responsive**: laptop → tablet → phone. On phones the main navigation becomes a floating dock.
- **Accessible**: semantic landmarks, skip link, keyboard focus styles, honours *reduced motion*.

## Pages

| File | What's on it |
| --- | --- |
| `index.html` | Portrait, bio, LinkedIn / Email / Scholar / Maps links, interactive figure for the Applied Energy paper (built from its published tables), Stanford "arcade" |
| `research.html` | Research themes, papers with venue metrics, service |
| `resume.html` | At-a-glance facts + the PDF rendered as paper sheets (links stay clickable), download button |
| `hobbies.html` | Side A: music (bands linking to tracks, guitar photo, live clips). Side B: football (Henry quote, Barça & Messi photos) |
| `404.html` | "Offside." page that GitHub Pages shows for unknown URLs |

```
assets/
  css/style.css      design tokens (colours, fonts) at the top, then components
  js/main.js         theme switch, scroll reveals, Stanford clock, copy-email, video player
  js/paperfig.js     the homepage figure: heatmap, profile, forecast, cross-country and short-term views
  js/resume.js       renders the résumé PDF with PDF.js (loaded from the jsDelivr CDN)
  img/               web-optimised photos (WebP), logos, favicon, social preview card
  video/             re-encoded live clips (H.264, fast-start)
  docs/              Soumyadeep_Dhar_Resume.pdf
```

## Preview locally

```bash
cd website
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Publish on GitHub Pages

1. On github.com, create a **public** repository named **`<your-username>.github.io`**
   (don't add a README; this folder already has one).
2. From this folder:

   ```bash
   git add -A
   git commit -m "Launch personal academic website"
   git remote add origin https://github.com/<your-username>/<your-username>.github.io.git
   git push -u origin main
   ```

3. In the repository, open **Settings → Pages** and check that the source is
   **Deploy from a branch → `main` / `(root)`**. The site is live at
   `https://<your-username>.github.io` within a minute or two.

> If you publish it as a *project* site (a repository with any other name), the site lives at
> `https://<your-username>.github.io/<repo-name>/`. Everything works the same, except in
> `404.html`: change `<base href="/">` to `<base href="/<repo-name>/">`.

### Making changes later

Edit the files, then from this folder:

```bash
git add -A
git commit -m "Describe the change"
git push
```

GitHub Pages rebuilds automatically; the live site updates within a minute or two.

- **Résumé link**: the "Website" link inside the PDF still points to the old Google Site.
  Update it in the LaTeX source to <https://sdhar1602.github.io> and re-export.

## Updating content

- **Résumé**: replace `assets/docs/Soumyadeep_Dhar_Resume.pdf` (same filename). The page re-renders
  from the PDF automatically. Also update the short "At a glance" list in `resume.html` if needed.
- **New paper**: in `research.html`, copy an `<article class="pub">…</article>` block into the right
  group, then update its number (`J2`, `C2`, …) and the group's count. Optionally add it to the
  "Recent papers" list in `index.html`.
- **Photos**: drop a new image into `assets/img/` (WebP or JPEG, ~1–2k px wide) and point the
  `<img src>` at it. Keep the `width`/`height` attributes roughly matching the image's shape.
- **Research figure data**: the numbers live at the top of `assets/js/paperfig.js`, copied from the
  paper's Tables 4, 5, 6 and Appendix B. Edit them there if a revision changes any result.
- **Colours and fonts**: everything is driven by the custom properties at the top of
  `assets/css/style.css` (one block for light, one for dark).
