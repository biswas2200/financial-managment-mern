import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';

test.use({ reducedMotion: 'reduce' });

const reader = (page) => page.getByRole('dialog', { name: /emergency fund/i });

// Likes and comments on an article are shared by everyone, so these tests read the numbers they start from
// and check how they change, instead of assuming a clean database.
const likeButton = (d) => d.getByRole('button', { name: /^Like, \d/ });
const dislikeButton = (d) => d.getByRole('button', { name: /^Dislike, \d/ });
const num = async (button) => Number((await button.getAttribute('aria-label')).split(', ')[1]);
const read = async (d) => ({ likes: await num(likeButton(d)), dislikes: await num(dislikeButton(d)) });
const commentCount = async (d) => Number((await d.getByRole('heading', { name: /^Comments \(\d+\)$/ }).textContent()).match(/\d+/)[0]);

test.describe('Learn', () => {
  test('articles are grouped by domain, and a topic filter keeps them to one', async ({ page }) => {
    await registerNewUser(page);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Learn' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Learn' })).toBeVisible();
    for (const d of ['Saving', 'Investing', 'Stocks', 'Mutual funds', 'Tax', 'Insurance', 'Credit & debt', 'Scams & safety']) {
      await expect(page.getByRole('heading', { level: 2, name: d })).toBeVisible();
    }
    await page.getByRole('group', { name: 'Topics' }).getByRole('button', { name: /Tax/ }).click();
    await expect(page).toHaveURL(/topic=tax/);
    await expect(page.getByRole('heading', { level: 2, name: 'Saving' })).toHaveCount(0);
  });

  test('an article opens over a blurred page, and the address can be shared', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/learn');
    await page.getByRole('link', { name: /Build an emergency fund/ }).click();
    await expect(page).toHaveURL(/\/learn\/emergency-fund$/);
    const dialog = reader(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Key takeaways' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: /RBI Kehta Hai/ })).toHaveAttribute('target', '_blank');
    // the page behind is blurred by the dialog's backdrop
    const blur = await page.evaluate(() => getComputedStyle(document.querySelector('dialog.reader'), '::backdrop').backdropFilter);
    expect(blur).toMatch(/blur\(\d+px\)/);

    await page.reload();
    await expect(reader(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/learn$/);
  });

  test('likes and dislikes are separate positive counts that never go below zero', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/learn/emergency-fund');
    const dialog = reader(page);
    await expect(likeButton(dialog)).toBeVisible();
    const start = await read(dialog);

    await likeButton(dialog).click();
    await expect(likeButton(dialog)).toHaveAttribute('aria-label', `Like, ${start.likes + 1}`);
    await expect(likeButton(dialog)).toHaveAttribute('aria-pressed', 'true');

    await dislikeButton(dialog).click(); // changes my mind: the like moves over to a dislike
    await expect(dislikeButton(dialog)).toHaveAttribute('aria-label', `Dislike, ${start.dislikes + 1}`);
    await expect(likeButton(dialog)).toHaveAttribute('aria-label', `Like, ${start.likes}`);
    await expect(dislikeButton(dialog)).toHaveAttribute('aria-pressed', 'true');

    await dislikeButton(dialog).click(); // takes it back
    await expect(dislikeButton(dialog)).toHaveAttribute('aria-label', `Dislike, ${start.dislikes}`);
    expect(await read(dialog)).toEqual(start);
    for (const b of [likeButton(dialog), dislikeButton(dialog)]) expect(await b.getAttribute('aria-label')).not.toMatch(/-/);
  });

  test('a reaction is saved by the server: it is still there after a reload, and the card shows it', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/learn/emergency-fund');
    await expect(likeButton(reader(page))).toBeVisible();
    const start = await read(reader(page));
    await likeButton(reader(page)).click();
    await expect(likeButton(reader(page))).toHaveAttribute('aria-label', `Like, ${start.likes + 1}`);
    await page.reload();
    await expect(likeButton(reader(page))).toHaveAttribute('aria-pressed', 'true');
    await expect(likeButton(reader(page))).toHaveAttribute('aria-label', `Like, ${start.likes + 1}`);
    await page.keyboard.press('Escape');
    const card = page.getByRole('link', { name: /Build an emergency fund/ }).locator('xpath=ancestor::article');
    await expect(card).toContainText(`${start.likes + 1} ${start.likes + 1 === 1 ? 'like' : 'likes'}`);
  });

  test('different people add to the same counts, and each sees only their own choice', async ({ page, browser }) => {
    await registerNewUser(page, 'Asha Rao');
    await page.goto('/learn/emergency-fund');
    await expect(likeButton(reader(page))).toBeVisible();
    const start = await read(reader(page));
    await likeButton(reader(page)).click();
    await expect(likeButton(reader(page))).toHaveAttribute('aria-label', `Like, ${start.likes + 1}`);

    const other = await browser.newContext({ locale: 'en-IN', reducedMotion: 'reduce' });
    const second = await other.newPage();
    await registerNewUser(second, 'Dev Patel');
    await second.goto('/learn/emergency-fund');
    const d2 = second.getByRole('dialog', { name: /emergency fund/i });
    await expect(likeButton(d2)).toHaveAttribute('aria-label', `Like, ${start.likes + 1}`); // Asha's like counts for Dev too
    await expect(likeButton(d2)).toHaveAttribute('aria-pressed', 'false'); // but it is not Dev's own choice
    await dislikeButton(d2).click();
    await expect(dislikeButton(d2)).toHaveAttribute('aria-label', `Dislike, ${start.dislikes + 1}`);
    await expect(likeButton(d2)).toHaveAttribute('aria-label', `Like, ${start.likes + 1}`);
    await other.close();
  });

  test('comments are saved, can be liked and disliked, and only the author can delete them', async ({ page, browser }) => {
    const text = `I started with one month of expenses (${Date.now()}).`;
    await registerNewUser(page, 'Asha Rao');
    await page.goto('/learn/emergency-fund');
    const dialog = reader(page);
    await expect(dialog.getByLabel('Add a comment')).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /^Comments \(\d+\)$/ })).toBeVisible();
    const before = await commentCount(dialog);
    await dialog.getByLabel('Add a comment').fill(text);
    await dialog.getByRole('button', { name: 'Post comment' }).click();
    const comment = dialog.getByRole('listitem').filter({ hasText: text });
    await expect(comment).toBeVisible();
    await expect(comment).toContainText('Asha R.');
    await expect(dialog.getByRole('heading', { name: `Comments (${before + 1})` })).toBeVisible();

    const other = await browser.newContext({ locale: 'en-IN', reducedMotion: 'reduce' });
    const second = await other.newPage();
    await registerNewUser(second, 'Dev Patel');
    await second.goto('/learn/emergency-fund');
    const theirs = second.getByRole('dialog').getByRole('listitem').filter({ hasText: text });
    await expect(theirs).toBeVisible();
    await expect(theirs.getByRole('button', { name: 'Delete comment' })).toHaveCount(0);
    await theirs.getByRole('button', { name: 'Dislike, 0', exact: true }).click();
    await expect(theirs.getByRole('button', { name: 'Dislike, 1', exact: true })).toBeVisible();
    await expect(theirs.getByRole('button', { name: 'Like, 0', exact: true })).toBeVisible();
    await other.close();

    await page.reload();
    const mine = reader(page).getByRole('listitem').filter({ hasText: text });
    await mine.getByRole('button', { name: 'Delete comment' }).click();
    await mine.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(reader(page).getByRole('heading', { name: `Comments (${before})` })).toBeVisible();
    await expect(reader(page).getByText(text)).toHaveCount(0);
  });

  test('an over-long comment is stopped at 600 characters', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/learn/emergency-fund');
    const box = reader(page).getByLabel('Add a comment');
    await box.fill('x'.repeat(700));
    await expect(box).toHaveValue('x'.repeat(600));
    await expect(reader(page).getByText('600/600')).toBeVisible();
  });
});
