import json
import os
from urllib import request

from playwright.sync_api import sync_playwright


API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:4000")
WEB_BASE = os.environ.get("WEB_BASE", "http://127.0.0.1:8082")


def json_request(path, method="GET", payload=None, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        headers["Content-Type"] = "application/json"

    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = request.Request(f"{API_BASE}{path}", data=body, headers=headers, method=method)
    with request.urlopen(req) as response:
        if response.status == 204:
            return None
        return json.loads(response.read().decode("utf-8"))


def authenticate(email, member_name, share_code=None):
    challenge = json_request(
        "/auth/request-link",
        method="POST",
        payload={"email": email},
    )
    return json_request(
        "/auth/verify",
        method="POST",
        payload={
            "challengeId": challenge["challengeId"],
            "code": challenge["devCode"],
            "memberName": member_name,
            "shareCode": share_code,
        },
    )


json_request("/debug/reset", method="POST", payload={})
health = json_request("/health")
mock_banking_enabled = health.get("bankProvider") == "mock"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 2200})
    page.goto(WEB_BASE, wait_until="networkidle")

    page.get_by_text("Sign in to the household.").wait_for()
    page.get_by_test_id("auth-email-input").fill("smoke-browser@orbit.household")
    page.get_by_test_id("auth-member-input").fill("Benjamin")
    page.get_by_test_id("auth-sharecode-input").fill("ORBIT-ES-01")
    page.get_by_test_id("auth-request-button").click()
    page.get_by_test_id("auth-verify-button").wait_for()
    page.get_by_test_id("auth-verify-button").click()

    page.get_by_text("Set up the household first.").wait_for()
    page.get_by_placeholder("Household name").fill("Pommeraud Family")
    page.get_by_placeholder("Primary adult").fill("Benjamin")
    page.get_by_placeholder("Partner / second adult").fill("Camille")
    page.get_by_text("FR", exact=True).click()
    page.get_by_text("Continue to dashboard").click()

    page.get_by_text("Add the subscriptions you already know.").wait_for()
    category_step_visible = page.get_by_text("Step 2 of 2").count() >= 1
    page.get_by_text("Phone & internet", exact=True).first.click()
    page.get_by_text("Freebox + Mobile").first.wait_for()
    page.get_by_text("Freebox + Mobile").first.click()
    page.get_by_placeholder("YYYY-MM-DD").fill("2026-04-05")
    page.get_by_text("Save subscription").click()

    page.get_by_text("Cloud & AI", exact=True).first.click()
    page.get_by_text("ChatGPT Plus").first.wait_for()
    page.get_by_text("ChatGPT Plus").first.click()
    page.get_by_placeholder("YYYY-MM-DD").fill("2026-04-18")
    page.get_by_text("Save subscription").click()
    page.get_by_text("Continue to dashboard").click()

    page.get_by_text("Recurring spend, under control.").wait_for()
    page.get_by_text("Cash-out timeline").wait_for()
    dashboard_visible = page.get_by_text("Recurring spend, under control.").is_visible()
    timeline_visible = page.get_by_text("Cash-out timeline").is_visible()
    category_dashboard_visible = page.get_by_text("Start From A Category In FR").count() >= 1
    candidate_visible = False

    if mock_banking_enabled:
        page.get_by_text("Demo BNP Paribas").first.click()
        page.locator("[data-testid^='sync-connection-']").first.click()
        page.get_by_text("Recurring candidates").wait_for()
        candidate_card = page.get_by_text("Canal+", exact=False).first
        candidate_card.wait_for()
        candidate_visible = candidate_card.is_visible()
        page.locator("[data-testid^='candidate-confirm-shared-']").first.click()
        page.get_by_text("Canal+", exact=False).first.wait_for()

    tracked_subscription = page.get_by_text("ChatGPT Plus", exact=True)
    tracked_subscription.first.wait_for()
    tracked_subscription.first.click()
    page.get_by_text("Manage subscription").wait_for()
    page.get_by_text("Mark cancelled").click()
    page.get_by_text("Cancelled subscriptions").wait_for()
    cancelled_visible = page.get_by_text("Cancelled subscriptions").is_visible()

    page.screenshot(
        path="/tmp/subscription-manager-mobile-web.png",
        full_page=True,
    )

    print("Category FTUE visible:", category_step_visible)
    print("Dashboard visible:", dashboard_visible)
    print("Category dashboard visible:", category_dashboard_visible)
    print("Timeline visible:", timeline_visible)
    print("Mock banking enabled:", mock_banking_enabled)
    print("Candidate visible:", candidate_visible)
    print("Cancelled visible:", cancelled_visible)

    browser.close()


cleanup_session = authenticate("smoke-browser@orbit.household", "Benjamin", "ORBIT-ES-01")
cleanup_token = cleanup_session["token"]
json_request("/debug/reset", method="POST", payload={})
