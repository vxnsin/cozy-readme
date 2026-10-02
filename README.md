# cozy-readme

<!-- cozy:cards -->

Old-web style, animated SVG cards for your GitHub profile README: a pixel-star header with a typewriter, an about window, your tech stack, the anime you watched last, GitHub stats with a hit counter, a themed contribution snake, a marquee, 88x31 buttons and a footer. Light and dark versions follow the viewer's GitHub theme.

It works for project READMEs too: a repo overview, a `git log` with weekly activity, releases and contributors (the cards at the top of this page).

The look comes from [vensin.dev](https://vensin.dev). See it live on [github.com/vxnsin](https://github.com/vxnsin).

**→ [Open the configurator](https://vxnsin.github.io/cozy-readme/)**: pick your cards, see a live preview and copy two files.

## Setup

1. Open your profile repo `github.com/<you>/<you>` (create it if it doesn't exist yet), or any project repo.
2. Add a `cozy.config.json`. The [configurator](https://vxnsin.github.io/cozy-readme/) writes it for you, or start from [examples/vxnsin.config.json](examples/vxnsin.config.json).
3. Add `.github/workflows/cozy-readme.yml`:

   ```yaml
   name: cozy-readme

   on:
     schedule:
       - cron: '0 0 * * *'
     workflow_dispatch:
     push:
       paths: ['cozy.config.json', 'README.template.md']

   permissions:
     contents: write

   jobs:
     cozy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: vxnsin/cozy-readme@v1
   ```

4. Run the workflow once from the **Actions** tab.

The action does three things:
- It renders every card into an `output` branch. That branch is force-pushed as a single commit, so it never grows.
- It writes your `README.md`.
- It runs again every night.

## Action inputs

| input | default | |
|---|---|---|
| `config` | `cozy.config.json` | path to the config |
| `template` | – | README template, see below |
| `readme` | `README.md` | file to write |
| `output_branch` | `output` | where the SVGs live |
| `github_token` | `github.token` | Used for the stats and for pushing. With a personal access token, private contributions count too. |
| `mal_client_id` | – | Only needed for MyAnimeList. Pass it from a secret. |
| `commit_message` | `Update profile README` | |

## Config

```jsonc
{
  "theme": "spring",                 // spring, summer, autumn, halloween, winter
                                     // or { "preset": "spring", "light": { "accent": "#..." }, "dark": { ... } }
  "since": "2018-01-01",             // fills {years} and {since}
  "github": { "user": "you", "excludeLanguages": ["HTML"] },
  "anime": { "source": "anilist", "user": "you", "count": 10 },
  "readme": { "align": "center", "before": "", "after": "" },
  "cards": [
    { "type": "header", "wordmark": "you.dev", "typewriter": ["a developer", "an anime enjoyer"] },
    { "type": "about", "paragraphs": ["hi!"] },
    { "type": "anime", "link": "https://anilist.co/user/you" }
  ]
}
```

Every card takes an optional `id` (used as the file name and for templates) and an optional `link`. Buttons and badges that follow each other share one line.

| type | what it is | main options |
|---|---|---|
| `header` | starfield banner with wordmark and typewriter | `title`, `wordmark`, `subtitle`, `typewriter[]`, `chips[]`, `hint`, `effect` (`sakura` `snow` `leaves` `none`) |
| `about` | about.txt with a status window next to it | `heading`, `paragraphs[]`, `signoff`, `status.rows[]` (`{label, value}` or `{label, moods[]}`), `status.yearProgress` |
| `stack` | chips with icons | `groups[]` of `{label, items[]}`. An item is a name, or `{name, icon, color}`. Icons are bundled or come from [simple-icons](https://simpleicons.org). |
| `anime` | scrolling poster strip | `title`, `newBadge`, `speed` |
| `stats` | stat boxes, 52-week chart, hit counter, languages | `boxes[]` (`contributions` `commits` `repos` `stars` `followers`), `counter` |
| `snake` | [Platane/snk](https://github.com/Platane/snk) in your theme colours | `title`, `right` |
| `marquee` | scrolling text line | `lines[]`, `separator`, `speed` |
| `button` | clickable nav button | `label`, `link` |
| `badge` | 88x31 button | `top`, `bottom`, `mark`, `color`, `link` |
| `footer` | wordmark, small print and a day counter | `wordmark`, `text`, `note`, `counterLabel`, `counterSince` |
| `repo` | repo overview: name, description, topics, counters, languages | `name`, `description`, `boxes[]` (`stars` `forks` `issues` `commits` `watchers` `contributors`), `topics`, `languages` |
| `commits` | `git log` of the latest commits plus 52 weeks of activity | `count`, `prompt`, `chart`, `counter` |
| `releases` | latest releases, the newest one blinks | `count`, `latestBadge` |
| `contributors` | avatar grid with contribution counts | `count` |

The repo cards read `config.repo` (`owner/name`). Without it they use the repo the action runs in.

Text fields can use these placeholders:
- `{year}`, `{date}`, `{years}`, `{since}`
- `{anime.latest}`, `{anime.title}`
- `{github.lastPush}`, `{github.user}`, `{github.contributions}`, `{github.repos}`, `{github.stars}`
- `{repo.name}`, `{repo.shortName}`, `{repo.description}`, `{repo.stars}`, `{repo.forks}`, `{repo.commits}`, `{repo.release}`, `{repo.license}`, `{repo.branch}`

### Anime sources

| source | user | notes |
|---|---|---|
| `anilist` | AniList username | Official API. The list has to be public. |
| `kitsu` | Kitsu profile slug | Official API. |
| `myanimelist` | MAL username | Needs a client id from [myanimelist.net/apiconfig](https://myanimelist.net/apiconfig), passed as `mal_client_id`. |
| `aniworld` | aniworld profile name | Scrapes the public "watched" page and takes covers from Kitsu. This can break whenever the site changes. |

### Your own text around the cards

There are three ways, from least to most control:

1. **Nothing.** The README is just the cards in order, plus `readme.before` and `readme.after`. This fits a profile.
2. **Markers** in your existing README. This fits project repos. The action only fills the marked spots and leaves everything else as you wrote it:

   ```markdown
   # my project

   <!-- cozy:repo -->

   some text you wrote yourself …

   <!-- cozy:commits -->
   ```

   `<!-- cozy:<id> -->` places a single card, and `<!-- cozy:cards -->` places all of them. After the first run each marker gets a matching `<!-- /cozy:<id> -->`. Don't edit anything between the two.
3. **A template.** Add a `README.template.md` and set `template: README.template.md` on the action. In the template, `{{cards}}` inserts all cards and `{{card:<id>}}` inserts a single one.

## Local preview

Requires Node 20 or newer. There are no dependencies.

```bash
GITHUB_TOKEN=$(gh auth token) node bin/cli.js --config examples/vxnsin.config.json --out out --readme out/README.md --base-url .
```

To work on the configurator, serve the repo root (for example with `python -m http.server`) and open `/site/`.

## License

MIT
