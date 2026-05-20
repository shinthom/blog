-- Optional: seed the blog with the original sample posts.
-- Run after schema.sql, once, in the Supabase SQL editor.

insert into public.posts (slug, title, category, excerpt, status, published_at, content)
values
  (
    'welcome',
    'Welcome to my blog',
    'fun',
    'A short note about this blog and what to expect.',
    'published',
    '2026-05-20T00:00:00Z',
    $md$This is a minimalist blog inspired by [Vitalik Buterin's website](https://vitalik.eth.limo/).

The layout intentionally stays close to the original: a centered title, a row of category links between two horizontal rules, and a chronological list of posts below.

## Why this style?

Three reasons:

1. **Content first.** No sidebar widgets, no comment popovers, no newsletter modals — just text.
2. **Readability.** A narrow column (760px), generous line height, and a single body font keep the focus on the words.
3. **Light & dark.** A simple toggle in the corner switches between a white page and a near-black page with gold accents.

> Premature optimization is the root of all evil. — Donald Knuth

## Math works too

Inline math like $E = mc^2$ renders inline. Display math:

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

## Code blocks

```ts
function greet(name: string) {
  return `Hello, ${name}!`;
}
```

That's it. Add more posts in the `posts/` directory.$md$
  ),
  (
    'llm-as-a-tool',
    'Treating an LLM as a tool, not an oracle',
    'ai',
    'A short note on the mental model that keeps me sane when working with language models.',
    'published',
    '2026-05-10T00:00:00Z',
    $md$The most useful shift I made last year was to stop asking *"is this answer correct?"* and start asking *"would I have asked a junior teammate this question the same way?"*

LLMs are excellent at:

- restating something you already half-understand,
- generating five plausible variations so you can pick one,
- flagging the parts of a draft that read awkwardly.

They are bad at:

- being the *last* check on anything that matters,
- remembering constraints you set three turns ago,
- noticing that the question itself was wrong.

If I treat the model as a tireless intern who happens to have read a lot, I get a lot of leverage. If I treat it as an oracle, I get burned.$md$
  ),
  (
    'roguelike-design',
    'What makes a roguelike feel fair?',
    'game',
    'Notes on randomness, run length, and the gap between dying and learning.',
    'published',
    '2026-04-15T00:00:00Z',
    $md$A roguelike feels *unfair* when the player can't tell which decision killed them. Three knobs help:

1. **Telegraph the threat.** Every lethal moment should be readable a beat before it lands.
2. **Make randomness diegetic.** A random encounter is fine; a random damage roll on a hit you already committed to is not.
3. **Keep runs short enough to retry.** 20 minutes is the sweet spot — long enough to invest, short enough to laugh off.

The best run-based games leave the player thinking *"next time I'll try X"* instead of *"the dice screwed me."*$md$
  ),
  (
    'decentralization',
    'What does decentralization actually mean?',
    'blockchain',
    'Three axes for thinking about it.',
    'published',
    '2026-03-02T00:00:00Z',
    $md$It's worth being precise about *which* decentralization you mean. I usually split it into three axes:

| Axis           | Question                                          |
| -------------- | ------------------------------------------------- |
| Architectural  | How many physical machines run the system?        |
| Political      | How many independent parties control those nodes? |
| Logical        | Does the system look like one thing or many?      |

A system can be decentralized on one axis and centralized on another.

For example, an ETF that holds bitcoin is *logically* and *architecturally* decentralized through the underlying network, but *politically* very centralized at the custody layer.$md$
  ),
  (
    'rollups-in-one-page',
    'Rollups in one page',
    'blockchain',
    'The minimum you need to know about optimistic and ZK rollups.',
    'published',
    '2026-01-21T00:00:00Z',
    $md$A rollup runs transactions off-chain and posts a compressed summary back to the base layer. Two flavors:

- **Optimistic rollups** assume the operator is honest and let anyone challenge a bad state root during a fraud-proof window (typically 7 days).
- **ZK rollups** post a succinct cryptographic proof with every batch — no waiting period, but the prover is more expensive to run.

The trade-off is roughly: optimistic rollups have cheaper proving and a long withdrawal delay; ZK rollups have higher proving cost and near-instant finality on the base layer.$md$
  )
on conflict (slug) do nothing;
