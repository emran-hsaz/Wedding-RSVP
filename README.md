# Ahmed & Rawan — Wedding RSVP

A single-page wedding site with a live countdown and an RSVP form that posts
straight into an existing Google Form. Plain HTML / CSS / vanilla JS — no build
step, no dependencies, no API keys.

**Saturday, 10 October 2026 · 8:00 PM · Dunes Club, Airport Street, Amman, Jordan**
RSVP deadline: **26 September 2026**.

## Structure

```
index.html          hero · countdown · details · venue · RSVP · footer
assets/styles.css   sage-green & cream design system
assets/app.js       countdown, scroll reveal, Google Forms submission
vercel.json         static hosting config
```

## Google Form wiring

Responses are posted to the live form's `formResponse` endpoint as `FormData`
with `mode: "no-cors"`. Opaque responses can't be read, so success is shown
optimistically once the request is dispatched.

Form ID: `1FAIpQLSeSD16PNk9E58y66-ZE1n2k4e8hrH2YjhoCexKhlGOcYEVKKQ`

### ⚠️ Required setting: the form must not require sign-in

As built, the form shows **"Sign in to continue — you must sign in to fill out
this form"**, every field is disabled, and `POST /formResponse` returns
**HTTP 401**. Until that is turned off, RSVPs submitted from this site are
silently discarded (a `no-cors` response is opaque, so the page can't detect it
and will still show the thank-you message).

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

## Deploy

Static site, no framework. Vercel serves `index.html` from the repo root with
zero configuration — no build command, no output directory.
