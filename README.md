# Ahmed & Rawan — Wedding RSVP

A single-page wedding site with a live countdown and an RSVP form that posts
straight into an existing Google Form. Plain HTML / CSS / vanilla JS — no build
step, no dependencies, no API keys.

**Saturday, 10 October 2026 · 8:00 PM · Dunes Club, Airport Street, Amman, Jordan**
RSVP deadline: **26 September 2026**.

## Structure

```
index.html          hero · countdown · details · venue · RSVP · footer
assets/styles.css   light pink & rose responsive design system, motion, reduced-motion support
assets/app.js       invitation, countdown, scroll reveal, Google Forms submission
assets/wedding-still-life.webp  original silk-and-roses hero artwork (116 KB)
assets/invitation-theme.css    satin-and-lace theme based on the video reference
assets/ivory-satin.webp         original satin background (164 KB)
assets/lace-envelope.webp       original transparent lace envelope (389 KB)
tests/site.test.cjs isolated behavior and asset checks, no live RSVP submissions
vercel.json         static hosting config
```

## Google Form wiring

Responses are posted to the live form's `formResponse` endpoint as `FormData`
with `mode: "no-cors"`. Opaque responses can't be read, so success is shown
as sent once the request resolves. The thank-you panel explicitly says that
delivery cannot be verified. Network failures and timeouts keep the form and
entered values visible, restore the submit button, and offer a direct form link.

Form ID: `1FAIpQLSeSD16PNk9E58y66-ZE1n2k4e8hrH2YjhoCexKhlGOcYEVKKQ`

### Integration setting to verify: guest access

An earlier integration review reported that this Google Form required sign-in
and rejected unauthenticated submissions with HTTP 401. Its current settings
have not been verified in this design refactor. Google can reject submissions
even when the request resolves because `no-cors` responses hide HTTP status.
Check the form in a signed-out browser before relying on guest replies.

Fix it in the form editor: **Settings → Responses → turn off "Requires sign in"**
(on a Google Workspace account this reads *"Restrict to users in <domain> and its
trusted organizations"*), then confirm:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST "https://docs.google.com/forms/d/e/<FORM_ID>/formResponse" \
  --data-urlencode "entry.1498135098=connectivity check" \
  --data-urlencode "entry.877086558=Not sure yet" \
  --data-urlencode "entry.111771323=1 guest"
```

`200` means responses are being accepted. `401` means sign-in is still required.

| Question (exact label) | Type | Entry ID | Required |
| --- | --- | --- | --- |
| `Will you be joining us?` | Multiple choice | `entry.877086558` | yes |
| `Your Full Name` | Short answer | `entry.1498135098` | yes |
| `Number  of Attendance ( Total Guests )` | Dropdown | `entry.111771323` | yes |
| `Invited guest's full name ` | Paragraph | `entry.2606285` | no |

Attendance shows friendly labels but submits the form's exact option strings:

| Shown to guest | Submitted value |
| --- | --- |
| Attending | `Yes !!!!!!!` |
| Not Attending | `Unfortunately, can't make it` |
| Still Deciding | `Not sure yet` |

Re-extract the IDs at any time:

```bash
curl -sL "https://docs.google.com/forms/d/e/<FORM_ID>/viewform" \
  | grep -o 'FB_PUBLIC_LOAD_DATA_ = .*;' | head -c 4000
```

### The "5+ guests" option

`GUESTS_OTHER_ENABLED` in [`assets/app.js`](assets/app.js) is **`false`**.

The guest-count question is currently a **Dropdown**, and Google Forms only
supports an "Other" choice on *Multiple choice* and *Checkbox* questions — so
posting `__other_option__` to a dropdown is rejected and the required answer
never records. With the flag off, the site offers 1–4 guests.

The form does contain a fifth option labelled `other`, but that is an **ordinary
option**, not Google's Other mechanism: choosing it submits the literal string
`other` and there is no field to carry the actual guest count.

To enable the real thing:

1. Open the form editor → the "Number of Attendance" question.
2. Change its type from **Dropdown** to **Multiple choice**.
3. Delete the plain `other` option, then click **Add "Other"**.
4. Set `GUESTS_OTHER_ENABLED = true` and push.

The entry ID (`111771323`) is unchanged by that edit. The submission logic for
the option pair is already written:

```js
fd.append("entry.111771323", "__other_option__");
fd.append("entry.111771323.other_option_response", "6 guests");
```

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Design and motion

The customer's video reference informs the ivory satin background, lace-edged
envelope, rose-gold A&R seal, centered invitation, fine event timeline, and
translucent floral RSVP panel. Bodoni Moda headings, Italianno name lettering,
and Inter form text balance the reference style with readable controls.
Original optimized WebP artwork provides the fabric and envelope details;
the reference video's watermark, other couple's details, and browser UI are
not included. Shared layout and interaction styles remain in `styles.css`,
with the visual theme in `invitation-theme.css`.

The page retains staggered reveals, animated countdown updates, and a navigation
progress line. The invitation appears on every page load, including direct section links.
Click the card, swipe down at least 64 pixels anywhere on the opening screen,
or scroll down with a mouse wheel or trackpad to open it. The rose-gold cover
folds in 3D as you drag; short or sideways gestures return it to its closed state.
Reduced-motion visitors keep both opening controls without the 3D animation. Keyboard users can skip with
Escape; focus stays inside the opening dialog until it closes.

Layouts switch to a single column on phones. The RSVP action remains available
in the fixed navigation. Without JavaScript, content remains visible and the
direct Google Form link replaces the custom form controls.

## Checks

```bash
node --check assets/app.js
node --test tests/site.test.cjs
```

The tests exercise input validation, exact field values, failed and timed-out
requests, repeat submissions, countdown completion, dialog keyboard handling,
reduced-motion opening, and local asset references. All form requests are mocked.
These code checks do not replace visual browser QA.

## Deploy

Static site, no framework. Vercel serves `index.html` from the repo root with
zero configuration — no build command, no output directory.
