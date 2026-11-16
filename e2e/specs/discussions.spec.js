import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers.js';
import { CONSENT_GIVEN } from '../consent.js';

test.use({ reducedMotion: 'reduce' });

// Posts are shared by everyone, so every test uses titles of its own.
const stamp = Date.now();

async function newPost(page, { title, body, space }) {
  await page.getByRole('button', { name: 'New post' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'New post' });
  if (space) {
    await dialog.getByRole('combobox', { name: 'Space' }).click();
    await page.getByRole('option', { name: space }).click();
  }
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Your post').fill(body);
  await dialog.getByRole('button', { name: 'Post' }).click();
}

test.describe('Discussions', () => {
  test('starting a discussion: it is saved, opened for reading, and listed under its space', async ({ page }) => {
    await registerNewUser(page, 'Meera Iyer');
    await page.goto('/discussions');
    await newPost(page, { title: `How do I read a P/E ratio? ${stamp}`, body: 'I keep seeing P/E on every stock page. What is a sensible way to read it?', space: 'Stocks' });
    const reader = page.getByRole('dialog', { name: `How do I read a P/E ratio? ${stamp}` });
    await expect(reader).toBeVisible();
    await expect(reader).toContainText('Meera I.');
    await page.keyboard.press('Escape');

    const card = page.getByRole('link', { name: `How do I read a P/E ratio? ${stamp}` }).locator('xpath=ancestor::article');
    await expect(card).toContainText('Stocks');
    await expect(card).toContainText('0 comments');
    await page.getByRole('group', { name: 'Spaces' }).getByRole('button', { name: 'Mutual funds' }).click();
    await expect(page.getByRole('link', { name: `How do I read a P/E ratio? ${stamp}` })).toHaveCount(0);
    await page.getByRole('group', { name: 'Spaces' }).getByRole('button', { name: 'Stocks' }).click();
    await expect(page.getByRole('link', { name: `How do I read a P/E ratio? ${stamp}` })).toBeVisible();
  });

  test('a post with too little in it is explained, not sent', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/discussions');
    await newPost(page, { title: 'Hi', body: 'short' });
    const dialog = page.getByRole('dialog', { name: 'New post' });
    await expect(dialog.getByText(/title is too short/i)).toBeVisible();
    await expect(dialog.getByText(/post is too short/i)).toBeVisible();
  });

  test('other members can read, comment, like and dislike, but only the author can delete', async ({ page, browser }) => {
    await registerNewUser(page, 'Meera Iyer');
    await page.goto('/discussions');
    await newPost(page, { title: `SIP or lump sum for ten years? ${stamp}`, body: 'I can save 10,000 a month. Which approach do people usually prefer, and why?', space: 'Mutual funds' });
    const mine = page.getByRole('dialog', { name: `SIP or lump sum for ten years? ${stamp}` });
    await expect(mine.getByRole('button', { name: 'Delete post' })).toBeVisible();

    const other = await browser.newContext({ locale: 'en-IN', reducedMotion: 'reduce', storageState: CONSENT_GIVEN });
    const second = await other.newPage();
    await registerNewUser(second, 'Dev Patel');
    await second.goto('/discussions');
    await second.getByRole('link', { name: `SIP or lump sum for ten years? ${stamp}` }).click();
    const theirs = second.getByRole('dialog', { name: `SIP or lump sum for ten years? ${stamp}` });
    await expect(theirs).toContainText('Meera I.');
    await expect(theirs.getByRole('button', { name: 'Delete post' })).toHaveCount(0);
    await theirs.getByRole('button', { name: 'Dislike, 0', exact: true }).click();
    await expect(theirs.getByRole('button', { name: 'Dislike, 1', exact: true })).toBeVisible();
    await expect(theirs.getByRole('button', { name: 'Like, 0', exact: true })).toBeVisible();
    await theirs.getByLabel('Add a comment').fill('Starting a SIP now is simpler than timing a lump sum.');
    await theirs.getByRole('button', { name: 'Post comment' }).click();
    await expect(theirs.getByText('Starting a SIP now is simpler')).toBeVisible();
    await other.close();

    await page.reload();
    await expect(page.getByRole('dialog').getByText('Starting a SIP now is simpler')).toBeVisible();
    await mine.getByRole('button', { name: 'Delete post' }).click();
    await mine.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page).toHaveURL(/\/discussions$/);
    await expect(page.getByRole('link', { name: `SIP or lump sum for ten years? ${stamp}` })).toHaveCount(0);
  });

  test('a title with one very long word does not stretch the page or the reader on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await registerNewUser(page);
    await page.goto('/discussions');
    await newPost(page, { title: `Verylongword${'x'.repeat(90)}${stamp}`, body: 'A body long enough to be accepted by the form.' });
    const reader = page.getByRole('dialog');
    await expect(reader.getByRole('heading', { level: 2 })).toBeVisible();
    const inside = await reader.getByRole('heading', { level: 2 }).evaluate((h) => h.getBoundingClientRect().right <= window.innerWidth + 1);
    expect(inside, 'the title stays inside the screen').toBe(true);
    await page.keyboard.press('Escape');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('closing a post puts focus back on the card you opened it from, and letters typed in it are not shortcuts', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/discussions');
    await newPost(page, { title: `Focus check ${stamp}`, body: 'A body long enough to be accepted by the form.' });
    await page.keyboard.press('n'); // inside the post: must not open "Add expense" on top of it
    await expect(page.getByRole('dialog', { name: /Add expense/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    const link = page.getByRole('link', { name: `Focus check ${stamp}` });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: `Focus check ${stamp}` })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(link).toBeFocused();
  });

  test('"Most liked" puts the post with more likes ahead of the one with fewer', async ({ page }) => {
    await registerNewUser(page);
    await page.goto('/discussions');
    await newPost(page, { title: `First question here ${stamp}`, body: 'The first of two questions I have about saving.' });
    await page.keyboard.press('Escape');
    await newPost(page, { title: `Second question here ${stamp}`, body: 'The second of two questions I have about saving.' });
    await page.keyboard.press('Escape');
    const first = page.getByRole('link', { name: `First question here ${stamp}` }).locator('xpath=ancestor::article');
    await first.getByRole('button', { name: 'Like, 0', exact: true }).click();
    await expect(first.getByRole('button', { name: 'Like, 1', exact: true })).toBeVisible();
    // Sample discussions with many likes come first, so keep loading until both of ours are on the page.
    const showMore = page.getByRole('button', { name: 'Show more posts' });
    const order = async () => {
      while (await showMore.isVisible()) {
        await showMore.click();
        await page.waitForTimeout(300);
      }
      return page.getByRole('article').evaluateAll((els, s) => els.map((el) => el.textContent).map((t) => (t.includes(`First question here ${s}`) ? 'first' : t.includes(`Second question here ${s}`) ? 'second' : null)).filter(Boolean), stamp);
    };

    await page.getByText('Most liked').click();
    await expect.poll(order).toEqual(['first', 'second']);
    await page.getByText('Newest').click();
    await expect.poll(order).toEqual(['second', 'first']);
  });

  test('deleting an account removes what the person posted', async ({ page, browser }) => {
    const leaver = await registerNewUser(page, 'Leaving Person');
    await page.goto('/discussions');
    await newPost(page, { title: `A post that will vanish ${stamp}`, body: 'This post should disappear with the account that wrote it.' });
    await page.keyboard.press('Escape');
    await page.goto('/settings/privacy');
    await page.getByRole('button', { name: 'Delete my account' }).click();
    const d = page.getByRole('dialog', { name: 'Delete your account?' });
    await d.getByLabel('Your password').fill(leaver.password);
    await d.getByRole('button', { name: 'Delete everything' }).click();
    await expect(page).toHaveURL(/\/login$/);

    const other = await browser.newContext({ locale: 'en-IN', reducedMotion: 'reduce', storageState: CONSENT_GIVEN });
    const second = await other.newPage();
    await registerNewUser(second);
    await second.goto('/discussions');
    await expect(second.getByRole('link', { name: `A post that will vanish ${stamp}` })).toHaveCount(0);
    await other.close();
  });
});
