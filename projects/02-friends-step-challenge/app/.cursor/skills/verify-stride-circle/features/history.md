# History

## Sub-features

- Seven-day step recap.
- Select a day and inspect its saved steps.
- Review recorded walks and runs.
- Open a recorded activity detail.

## How to get to it (user POV)

Sign in, then select the History tab. The route is `/history`.

## Driving it with browser automation

Assert `YOUR HISTORY`, `Your progress`, `This week`, and `Step days`. Select a day tab and assert that the selected day summary changes. With seeded authenticated data, select a recorded activity and assert that the activity detail route opens.

## Gotchas

Empty history is a valid state for a new account. Firebase configuration and seeded records are required to prove populated summaries.

