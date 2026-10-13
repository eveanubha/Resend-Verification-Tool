# Resend runner

## Deploy
1. Push this folder to a GitHub repo (or run `npx vercel` inside it).
2. In Vercel: Project > Settings > Environment Variables, add `APP_PASSWORD` with any password you choose.
3. Redeploy, open the URL, enter that password in the tool.

## Notes
- The page loop runs in your browser tab; each email is processed by a server function (headless Chrome), so your computer does no heavy work. Keep the tab open until it finishes.
- Vercel Hobby limits a function to 60 s. One email normally takes 10-20 s.
- "Download remaining emails" gives you the CSV of anything not yet processed.
