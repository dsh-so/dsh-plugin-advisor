# dsh-plugin-finder

Find DeepSeek Harness plugins from the [dsh.so](https://dsh.so) registry — like *find-skill*, but for dsh plugins.

The plugin registers one tool, `find_plugin`, which takes a free-text need ("vision OCR screenshots", "terminal TUI", "memory rag") and returns the best-matching plugins from the dsh.so index: name, GitHub stars, topics, an install command, and a detail link.

## Install

```sh
dsh plugin --profile web add dsh-plugin-finder
# or from a local checkout of this project
dsh plugin --profile web add E:\AgentsWs\PluginBuilder\dsh-plugin-finder
```

## Usage

Ask the agent something like:

- "Find me a plugin for OCR / screenshots"
- "I need a terminal TUI plugin"
- "What dsh plugins exist for memory / RAG?"

The model calls `find_plugin`, then offers install commands.

## Configuration

`cordis.yml`:

```yaml
- insert:
    - id: dsh-plugin-finder
      name: dsh-plugin-finder
      config:
        indexUrl: https://www.dsh.so/plugins-index.json  # override for self-host / testing
        maxResults: 5                                     # default result count
        cacheTtlMs: 600000                                # reuse index for 10 min
        timeoutMs: 15000                                  # fetch timeout
```

## Data source

The plugin fetches `https://www.dsh.so/plugins-index.json` — a machine-readable index of every plugin listed on dsh.so (id, name, description, stars, topics, install command, detail URL). Results are ranked by keyword overlap with name (3x), topics (2x), description (1x), then GitHub stars.

## Develop

```sh
pnpm install     # or npm install in an isolated dir (peer deps come from the dsh host)
pnpm build       # tsc -> lib/
pnpm test        # node --test (match logic)
```

The bundle targets `@deepseek-ai/dsh-tools@0.1.0-rc.6` (matches the current dsh release line); `@deepseek-ai/cordis` is a peer dependency provided by the host.
