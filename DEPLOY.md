# How to publish changes

Claude only ever pushes code to GitHub. Publishing to Vercel is done here, by you.

Live site: **https://wedding-rsvp-l5uz.vercel.app**
Vercel project: **https://vercel.com/emran-abdallas-projects/wedding-rsvp-l5uz**
GitHub repo: **https://github.com/emran-hsaz/Wedding-RSVP**

---

## Normal flow (should be automatic)

The repo is connected to Vercel, so a push to `main` publishes on its own.

1. Open the **Vercel project link** above.
2. Click the **Deployments** tab.
3. Find the newest row — it shows the commit message Claude just pushed.
4. Wait for its status to turn **Ready** (green). Usually under a minute.
5. Open the **live site link** and hard-refresh:
   - Mac: `Cmd + Shift + R`
   - iPhone: close the tab completely and reopen the link

That's it. Nothing to click, nothing to type.

---

## If the newest commit isn't listed at all

The GitHub connection dropped.

1. Vercel project → **Settings** → **Git**
2. Connect `emran-hsaz/Wedding-RSVP`
3. Go back to **Deployments** → **⋯** menu on the top row → **Redeploy**

---

## If the status says "Blocked" (red)

This is Vercel refusing to build. It is never a problem with the website code —
the same code already built fine before.

1. **Click the blocked deployment row.** Vercel shows a banner at the top saying
   exactly why. Read that first; it decides which fix below applies.
2. Common causes and their fixes:

   | What the banner says | What to do |
   | --- | --- |
   | Free / Hobby usage limit reached | Wait for the limit to reset, or remove unused projects under **Settings → General → Delete Project** |
   | Spend limit / billing hold | **Settings → Billing** on the team, clear the hold |
   | Deployment from an unauthorized Git author | **Settings → Git → Ignored Build Step / Git authors**, allow the author |
   | Project paused | **Settings → General**, unpause |

3. After fixing, go to **Deployments** → **⋯** on that row → **Redeploy**.

### Fastest workaround if you just need it live now

The previous **Ready** deployment is still fine, and you can promote any build:

1. **Deployments** tab
2. **⋯** menu on the row you want → **Promote to Production**

---

## Checking it actually worked

Open the live site and confirm the newest change is visible. As of the envelope
update you should see:

- A full-screen **envelope** with an "A & R" gold seal and "OPEN THE INVITATION"
- After clicking it, the countdown reads **"Until we celebrate together"**

If you still see the old version, it's almost always browser cache — hard-refresh
again, or try a private/incognito window.

---

## Separate from all of this: the RSVP blocker

Deploying does **not** fix RSVPs. The Google Form currently requires guests to
sign in, so submissions are rejected and silently lost.

Sign in as `weddingrsvp001@gmail.com` → open the form → **Settings** →
**Responses** → turn off:

- **Limit to 1 response**
- **Collect email addresses**

See [README.md](README.md) for the full explanation and a way to verify it.
