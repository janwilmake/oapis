Look at openapisearch; Find back my hardcoded dataset of openapis and create a KV from that that goes from server to the location. Use this as JSON as a fallback if the server openapi wasn't found - 🔥SIMPLICITY🧡

Make a "macroview" in format:

```md
[CATEGORY A]

- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]

[CATEGORY B]

- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]

[CATEGORY C]

- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]
- [domain] - [title] - [contextual description]

Get a more detailed overview of an API by going to https://oapis.org/overview/[domain]
```

I need this macroview for all apis in the KV that I like, together with all my own APIs. I need this to be available as a context publicly. An agent using this prompt could then fetch multiple overviews to choose operations and getting their summary: `macroview => overview => summary => build.`

OpenAPI search should work, at least, and oapis can be powered by it. Find ways the data can remain most fresh.

Make oapis and openapisearch open-source. oapis powers lookup and transformations, reduce openapisearch to just the KV.

Having this, now I can also make a macro-overview, that has a single line per openapi; or maybe use tag-level overview.

Get function to get all repos (had i not tht in stars.uithub?)

Get all https://openapi.forgithub.com/janwilmake/[repo]/overview and also include repo url.

Instruct LLM more clearly on how to look up openapi or code, and to never make up stuff when building. Prefer exit if it fails.

https://chat.forgithub.com that exposes these contexts and allows directly chatting too.

In a way, this is my "dashboard".

Another great thing to work on (as part of the dashboard)

- get all operations in high-definition including context zoomed-out context and contextualisation within the openapi
- generate 'e2e tests and scenarios' that can be ran with expected output

This would be my test framework (openapi-based) but also kind of a 'user feedback' framework, and should definitely be highlighted in the dashboard.

Once I have this, definitely make a dashboard where just the overviews appear. A high-level overview over all my code where I can take actions from, is the best admin panel for me.

# zipobject

- Add correct binary URLs to zipobject (if possible)
- Zipstream
- Cache layer

Then... use zipobject at new uithub version, hosted at cloudflare.

Has huge downstream impact... Let's build this! Open source would be good for the world.

```

```
