#!/usr/bin/env python3
"""
End-to-end tests for the CGZSA website and content management system.

Drives a real browser against a running instance. Start the app first:

    npm run build && npm start
    npm run test:e2e
"""
import os
import re
import sys
import time
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("E2E_BASE", "http://localhost:3000")
ADMIN_EMAIL = os.environ.get("E2E_EMAIL", "n.clark@cgzsa.org")
ADMIN_PW = os.environ.get("E2E_PASSWORD", "ChangeThisPassword2026")

passed, failed = [], []


def check(name, condition, detail=""):
    if condition:
        passed.append(name)
        print(f"  ok    {name}")
    else:
        failed.append((name, detail))
        print(f"  FAIL  {name} {detail}")


def reset_lockout():
    """Clear failed attempts so a previous run does not lock this one out."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        return
    try:
        import subprocess
        subprocess.run(["psql", url, "-c", "delete from login_attempts where success = false"],
                       capture_output=True, timeout=10)
    except Exception:
        pass


def sign_in(page):
    page.goto(f"{BASE}/admin", wait_until="load")
    page.fill("#email", ADMIN_EMAIL)
    page.fill("#password", ADMIN_PW)
    page.click("button[type=submit]")
    page.wait_for_url(re.compile(r"/admin/dashboard"), timeout=15000)


def main():
    reset_lockout()
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------------------------------------------- public site
        print("\nPublic site")
        ctx = browser.new_context(viewport={"width": 1400, "height": 1000})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        for path, needle in [
            ("/", "Turning grassroots action"),
            ("/about", "Who We Are"),
            ("/about/mission-vision-values", "Twelve values"),
            ("/about/leadership", "Leadership"),
            ("/about/governance", "Bylaws"),
            ("/about/structure", "General Assembly"),
            ("/programs", "Programmes"),
            ("/programs/safe-drinking-water", "solar-powered tap"),
            ("/projects", "Projects"),
            ("/news", "News"),
            ("/events", "Events"),
            ("/resources/faqs", "Frequently Asked"),
            ("/resources/publications", "Publications"),
            ("/resources/gallery", "Gallery"),
            ("/contact", "Send us a message"),
            ("/get-involved/volunteer", "Volunteer"),
            ("/privacy-policy", "Privacy"),
            ("/cookie-policy", "Cookie"),
            ("/terms", "Terms"),
            ("/accessibility", "Accessibility"),
        ]:
            page.goto(BASE + path, wait_until="load")
            check(f"GET {path}", needle.lower() in page.content().lower())

        page.goto(BASE + "/no-such-page", wait_until="load")
        check("unknown page returns the 404 view", "cannot find that page" in page.inner_text("body").lower())

        page.goto(BASE + "/search?q=water", wait_until="load")
        check("search finds water content", "drinking water" in page.inner_text("body").lower())

        check("no JavaScript errors on the public site", not errors, str(errors[:2]))

        # ---------------------------------------------- accessibility basics
        print("\nAccessibility")
        page.goto(BASE, wait_until="load")
        check("exactly one h1", page.eval_on_selector_all("h1", "els => els.length") == 1)
        check("skip link present", page.eval_on_selector_all("a[href='#main']", "els => els.length") >= 1)
        check("main landmark present", page.eval_on_selector_all("main", "els => els.length") == 1)
        no_alt = page.eval_on_selector_all("img", "els => els.filter(e => !e.hasAttribute('alt')).length")
        check("every image has an alt attribute", no_alt == 0, f"{no_alt} without")
        page.keyboard.press("Tab")
        check("keyboard focus reaches a control", page.evaluate("document.activeElement.tagName") in ("A", "BUTTON", "INPUT"))

        # ---------------------------------------------- forms
        print("\nForms")
        page.goto(BASE + "/contact", wait_until="load")
        page.click("form button[type=submit]")
        page.wait_for_timeout(400)
        check("contact form refuses an empty submission", page.eval_on_selector_all("[role=alert]", "e => e.length") > 0)

        page.fill("#name", "Musu Kollie")
        page.fill("#email", "musu.k@example.lr")
        page.select_option("#subject", "Volunteering")
        page.fill("#message", "I would like to join the Saturday clean-up drives in Paynesville.")
        page.check("input[name=consent]")
        page.click("form button[type=submit]")
        page.wait_for_timeout(1500)
        check("contact form accepts a valid submission", "message received" in page.inner_text("body").lower())

        # ---------------------------------------------- live chat
        print("\nLive chat")
        page.goto(BASE, wait_until="load")
        page.click("text=Ask us a question")
        page.wait_for_timeout(400)
        page.fill("input[aria-label='Your message']", "Where is your office?")
        page.keyboard.press("Enter")
        page.wait_for_timeout(2500)
        dialog = page.inner_text("[role=dialog]")
        check("assistant answers from published content", "duport road" in dialog.lower())
        check("assistant cites its sources", page.eval_on_selector_all("[role=dialog] a[href^='/']", "e => e.length") > 0)

        page.fill("input[aria-label='Your message']", "How much did your largest donor give last year?")
        page.keyboard.press("Enter")
        page.wait_for_timeout(2500)
        dialog = page.inner_text("[role=dialog]")
        check("assistant refuses what is not published", "do not want to guess" in dialog.lower())
        check("assistant offers to take an email", page.eval_on_selector_all("input[aria-label='Your email address']", "e => e.length") == 1)

        # ---------------------------------------------- authorisation
        print("\nAuthorisation")
        anon = browser.new_context()
        ap = anon.new_page()
        for path in ["/admin/dashboard", "/admin/chat", "/admin/users", "/admin/settings", "/admin/news"]:
            ap.goto(BASE + path, wait_until="load")
            check(f"anonymous {path} is refused", ap.url.rstrip("/").endswith("/admin"))
        r = ap.request.post(f"{BASE}/api/upload", multipart={"altText": "x"})
        check("anonymous upload is refused", r.status == 403)
        r = ap.request.post(f"{BASE}/api/assistant/test", data={"question": "hello"})
        check("anonymous assistant test is refused", r.status == 403)
        anon.close()

        ap2 = browser.new_context().new_page()
        ap2.goto(f"{BASE}/admin", wait_until="load")
        # Deliberately a different address, so this test does not lock out the
        # account the rest of the suite needs.
        ap2.fill("#email", "nobody@cgzsa.org")
        ap2.fill("#password", "definitely-the-wrong-password")
        ap2.click("button[type=submit]")
        ap2.wait_for_timeout(1200)
        body = ap2.inner_text("body").lower()
        check("wrong password is refused", "not recognised" in body)
        check("failure does not reveal whether the account exists", "no such user" not in body and "unknown" not in body)

        # ---------------------------------------------- the editorial workflow
        print("\nEditorial workflow")
        staff = browser.new_context(viewport={"width": 1440, "height": 1000})
        sp = staff.new_page()
        sign_in(sp)
        check("sign-in reaches the dashboard", "/admin/dashboard" in sp.url)

        # A unique title per run, so a previous run's published article cannot
        # make the "draft is not public" check pass or fail by accident.
        stamp = str(int(time.time()))
        title = f"Volunteers clear the Duport Road drainage {stamp}"
        sp.goto(f"{BASE}/admin/news/new", wait_until="load")
        sp.fill("#title", title)
        sp.fill("#excerpt", "Sixty-two volunteers spent Saturday clearing the primary drainage channel before the rains.")
        sp.evaluate("""() => {
          const el = document.querySelector('[role=textbox]');
          el.innerHTML = '<p>Volunteers assembled at 07:00 and worked in four teams.</p>';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }""")
        sp.click("[data-testid=save]")
        sp.wait_for_url(re.compile(r"/admin/news/(?!new)"), timeout=15000)
        article_url = sp.url
        check("an article can be created", "/admin/news/" in article_url)

        # Version history: a second save must leave the first text recoverable,
        # including an undo of the most recent save.
        sp.goto(article_url, wait_until="load")
        sp.fill("#title", f"Rewritten headline {stamp}")
        sp.click("[data-testid=save]")
        sp.wait_for_load_state("networkidle")
        time.sleep(1.5)
        sp.goto(article_url, wait_until="load")
        restores = sp.eval_on_selector_all('button:has-text("Restore")', "els => els.length")
        check("a saved article keeps a restorable history", restores >= 1)
        if restores:
            sp.click('button:has-text("Restore")')
            time.sleep(2)
            sp.goto(article_url, wait_until="load")
            check("restoring brings back the earlier text", sp.input_value("#title") == title)
            check("restoring does not destroy the newer text",
                  sp.eval_on_selector_all('button:has-text("Restore")', "els => els.length") > restores)

        sp.goto(f"{BASE}/news", wait_until="load")
        check("a draft is not on the public site", stamp not in sp.inner_text("body"))

        sp.goto(article_url, wait_until="load")
        sp.click("button:has-text('Publish')")
        sp.wait_for_timeout(2500)
        sp.goto(f"{BASE}/news", wait_until="load")
        check("publishing puts it on the public site", stamp in sp.inner_text("body"))

        # the assistant should now know about it
        r = sp.request.post(f"{BASE}/api/chat/message", data={"body": "Tell me about the Duport Road drainage clearing"})
        check("published content reaches the assistant index", "drainage" in r.text().lower())

        # slug change leaves a redirect
        sp.goto(article_url, wait_until="load")
        old_slug = f"volunteers-clear-the-duport-road-drainage-{stamp}"
        sp.fill("#slug", f"duport-road-drainage-cleared-{stamp}")
        sp.click("[data-testid=save]")
        sp.wait_for_timeout(2000)
        old = sp.request.get(f"{BASE}/news/{old_slug}", max_redirects=0)
        check("changing a slug leaves a redirect behind", old.status in (301, 308), f"status {old.status}")

        # ---------------------------------------------- chat, staff side
        print("\nChat handover")
        v = browser.new_context()
        vp = v.new_page()
        vp.goto(BASE, wait_until="load")
        vp.click("text=Ask us a question")
        vp.wait_for_timeout(400)
        vp.fill("input[aria-label='Your message']", "Can somebody call me about a bench for our bus stop?")
        vp.keyboard.press("Enter")
        vp.wait_for_timeout(2500)

        sp.goto(f"{BASE}/admin/chat", wait_until="load")
        sp.wait_for_timeout(900)
        check("the conversation reaches the staff queue",
              sp.eval_on_selector_all("a[href^='/admin/chat?c=']", "e => e.length") > 0)
        sp.click("button:has-text('Take this conversation')")
        sp.wait_for_timeout(1800)
        sp.fill("input[aria-label='Reply']", "Good afternoon. Tell me which bus stop and I will add it to the survey list.")
        sp.click("button:has-text('Send')")
        sp.wait_for_timeout(2500)
        vp.wait_for_timeout(2500)
        check("the staff reply reaches the visitor live", "which bus stop" in vp.inner_text("[role=dialog]").lower())

        # ---------------------------------------------- audit
        print("\nAudit log")
        sp.goto(f"{BASE}/admin/audit", wait_until="load")
        audit = sp.inner_text("body")
        check("sign-in is recorded", "auth.login.success" in audit)
        check("publishing is recorded", "content.publish" in audit)
        check("chat actions are recorded", "chat.reply" in audit)
        check("no password appears in the audit log", ADMIN_PW not in audit)

        browser.close()

    print(f"\n{len(passed)} passed, {len(failed)} failed")
    for name, detail in failed:
        print(f"  FAILED: {name} {detail}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
