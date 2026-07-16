from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.goto("http://127.0.0.1:4173", wait_until="networkidle")
    assert page.get_by_role("heading", name="Die Welt, sortiert.").is_visible()
    assert page.get_by_role("button", name="KI & Agenten").is_visible()
    assert page.get_by_role("button", name="Aktualisieren").is_visible()
    page.get_by_role("button", name="Security & Privacy").click()
    assert page.get_by_role("heading", name="Security & Privacy").is_visible()
    search = page.get_by_role("textbox", name="Nachrichten durchsuchen")
    search.fill("not-a-real-match")
    assert page.get_by_role("heading", name="Keine Signale gefunden.").is_visible()
    search.fill("")
    page.get_by_role("button", name="Artikel speichern").first.click()
    assert page.get_by_role("button", name="Gespeichert").is_visible()
    page.get_by_role("button", name="Gespeichert").click()
    assert page.get_by_role("heading", name="Gespeicherte Signale").is_visible()
    assert not console_errors, console_errors
    page.screenshot(path="/tmp/signal-desk-desktop.png", full_page=True)

    mobile = browser.new_page(viewport={"width": 375, "height": 812})
    mobile.goto("http://127.0.0.1:4173", wait_until="networkidle")
    assert mobile.locator("body").evaluate("el => el.scrollWidth <= el.clientWidth")
    mobile.screenshot(path="/tmp/signal-desk-mobile.png", full_page=True)
    browser.close()
    print("browser smoke passed; console_errors=0; desktop=1280; mobile=375; horizontal_overflow=false")
