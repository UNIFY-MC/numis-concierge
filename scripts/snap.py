import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

OUT = 'design/referencia'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 1000})

    # Login com tema
    page.goto('http://localhost:3000/login')
    page.wait_for_load_state('networkidle')
    page.screenshot(path=f'{OUT}/atual-01-login.png')

    page.fill('input[name="password"]', '1938')
    page.click('button[type="submit"]')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2500)
    page.screenshot(path=f'{OUT}/atual-02-colecao.png', full_page=False)

    # Abrir um país
    grupo = page.locator('div.space-y-3 > div > button').first
    grupo.click()
    page.wait_for_timeout(700)
    page.screenshot(path=f'{OUT}/atual-03-pais-aberto.png', full_page=False)

    browser.close()
    print('✅ Screenshots atuais guardados em', OUT)
