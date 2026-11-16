import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

test.describe('Sign in and sign up', () => {
  test('keep one skyline running: switching pages does not draw it again from the start', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await page.evaluate(() => {
      window.__scene = document.querySelector('.sketch-scene');
      window.__t0 = window.__scene.getAnimations({ subtree: true }).length;
    });
    // let the picture get well into its drawing so a restart would be obvious
    await page.waitForTimeout(1200);
    const progressBefore = await page.evaluate(() => Math.max(...window.__scene.getAnimations({ subtree: true }).map((a) => Number(a.currentTime) || 0)));
    expect(progressBefore).toBeGreaterThan(1000);

    await page.getByRole('link', { name: 'Create an account' }).click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    const same = await page.evaluate(() => document.querySelector('.sketch-scene') === window.__scene);
    expect(same, 'the same drawing is still on the page').toBe(true);
    const progressAfter = await page.evaluate(() => Math.max(...window.__scene.getAnimations({ subtree: true }).map((a) => Number(a.currentTime) || 0)));
    expect(progressAfter, 'and it carried on instead of starting over').toBeGreaterThanOrEqual(progressBefore);

    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(await page.evaluate(() => document.querySelector('.sketch-scene') === window.__scene)).toBe(true);
  });

  test('keep the note about your data under the form, not over the drawing', async ({ page }) => {
    await page.goto('/login');
    const note = page.getByText('Your data stays in your own Kosha database.');
    await expect(note).toBeVisible();
    const box = await note.boundingBox();
    const form = await page.getByRole('button', { name: 'Sign in' }).boundingBox();
    expect(box.x, 'in the form column, on the right').toBeGreaterThan(720);
    expect(box.y, 'below the Sign in button').toBeGreaterThan(form.y + form.height);
  });

  test('has no demo-account helper, so nothing is typed into the form for you', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByText('Fill in demo account')).toHaveCount(0);
    await expect(page.getByText('Exploring the project?')).toHaveCount(0);
    await expect(page.getByLabel('Email')).toHaveValue('');
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  });
});
