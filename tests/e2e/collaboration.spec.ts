import { test, expect } from '@playwright/test';

test.describe('FS-02 Real-Time Collaborative Workspace Multi-Client E2E Scenario', () => {
  test('User A and User B concurrently edit document with live cursor and CRDT convergence', async ({
    browser,
  }) => {
    // 1. Create two isolated browser contexts for User A (Alice - Owner) and User B (Bob - Editor)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 2. User A logs in
    await pageA.goto('http://localhost:5173/login');
    await pageA.click('button:has-text("Alice")'); // 1-click fill demo
    await pageA.click('button[type="submit"]:has-text("Sign In")');

    // Wait for workspace and editor to mount
    await pageA.waitForURL(/\/workspace\/.*\/page\/.*/, { timeout: 15000 });
    const currentDocUrl = pageA.url();
    expect(currentDocUrl).toContain('/workspace/');

    // 3. User B opens the exact same workspace document in their isolated browser session
    await pageB.goto('http://localhost:5173/login');
    await pageB.click('button:has-text("Bob")'); // 1-click fill demo
    await pageB.click('button[type="submit"]:has-text("Sign In")');

    await pageB.waitForURL(/\/workspace\/.*\/page\/.*/, { timeout: 15000 });
    await pageB.goto(currentDocUrl);

    // 4. Verify connection status indicator on both clients shows Synced
    await expect(pageA.locator('text=Synced')).toBeVisible({ timeout: 10000 });
    await expect(pageB.locator('text=Synced')).toBeVisible({ timeout: 10000 });

    // 5. Verify presence: User A should see Bob in active collaborators, User B should see Alice
    await expect(pageA.locator('[title*="Bob"]').first()).toBeVisible({ timeout: 8000 });
    await expect(pageB.locator('[title*="Alice"]').first()).toBeVisible({ timeout: 8000 });

    // 6. User A types sentence into collaborative canvas
    const editorA = pageA.locator('.ProseMirror');
    await editorA.click();
    await pageA.keyboard.type('Hello from Alice in Browser A! ');

    // 7. User B should see text appear almost immediately without page refresh (CRDT sync over WebSocket)
    const editorB = pageB.locator('.ProseMirror');
    await expect(editorB).toContainText('Hello from Alice in Browser A!', { timeout: 5000 });

    // 8. User B appends second paragraph
    await editorB.click();
    await pageB.keyboard.press('Enter');
    await pageB.keyboard.type('Hello from Bob in Browser B!');

    // 9. User A receives Bob's edit immediately
    await expect(editorA).toContainText('Hello from Bob in Browser B!', { timeout: 5000 });

    // 10. Refresh User A's browser and verify durable PostgreSQL persistence restores content
    await pageA.reload();
    await expect(pageA.locator('text=Synced')).toBeVisible({ timeout: 10000 });
    await expect(pageA.locator('.ProseMirror')).toContainText('Hello from Alice in Browser A!');
    await expect(pageA.locator('.ProseMirror')).toContainText('Hello from Bob in Browser B!');

    await contextA.close();
    await contextB.close();
  });
});
