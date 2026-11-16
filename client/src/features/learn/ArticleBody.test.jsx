import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ArticleBody } from './ArticleBody.jsx';

const blocks = [
  { type: 'p', text: 'Opening paragraph.' },
  { type: 'h2', text: 'How much is enough?' },
  { type: 'ul', items: ['Three months of essentials', 'More if self-employed'] },
  { type: 'ol', items: ['Work out essentials', 'Automate a transfer'] },
  { type: 'callout', tone: 'warn', title: 'Keep it separate', text: 'Put the fund in its own account.' },
  { type: 'callout', tone: 'tip', title: 'A tip', text: 'Start small.' },
];

describe('ArticleBody', () => {
  it('renders paragraphs, headings and lists', () => {
    render(<ArticleBody blocks={blocks} />);
    expect(screen.getByText('Opening paragraph.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'How much is enough?' })).toBeInTheDocument();
    const lists = screen.getAllByRole('list');
    expect(within(lists[0]).getAllByRole('listitem')).toHaveLength(2);
    expect(lists[1].tagName).toBe('OL');
  });

  it('shows callouts with their title and text', () => {
    render(<ArticleBody blocks={blocks} />);
    const warn = screen.getByText('Keep it separate').closest('aside');
    expect(warn).toHaveTextContent('Put the fund in its own account.');
    expect(warn).toHaveAttribute('data-tone', 'warn');
    expect(screen.getByText('A tip').closest('aside')).toHaveAttribute('data-tone', 'tip');
  });

  it('shows text exactly as written: markup in an article is not run', () => {
    const { container } = render(<ArticleBody blocks={[{ type: 'p', text: '<img src=x onerror=alert(1)> and <b>bold</b>' }]} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText(/<b>bold<\/b>/)).toBeInTheDocument();
  });

  it('skips a block it does not know instead of crashing', () => {
    render(<ArticleBody blocks={[{ type: 'p', text: 'Fine' }, { type: 'video', url: 'x' }]} />);
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });
});
