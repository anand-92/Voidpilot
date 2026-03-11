[2026-03-11 15:55] - Updated by Junie
{
    "TYPE": "correction",
    "CATEGORY": "Avoid reuse",
    "EXPECTATION": "Create a new solution for the requested element without reusing existing components or primitives.",
    "NEW INSTRUCTION": "WHEN replacing the hero headline THEN build a new component without existing primitives."
}

[2026-03-11 15:56] - Updated by Junie
{
    "TYPE": "correction",
    "CATEGORY": "Use shadcn CLI",
    "EXPECTATION": "Leverage a plug-and-play shadcn component installed via their CLI instead of building from scratch.",
    "NEW INSTRUCTION": "WHEN a requested UI has a shadcn CLI component THEN install and use that component"
}

[2026-03-11 16:13] - Updated by Junie
{
    "TYPE": "negative",
    "CATEGORY": "UI stacking bug",
    "EXPECTATION": "Only one rotating headline phrase should be visible at a time without stacking.",
    "NEW INSTRUCTION": "WHEN updating animated headline roller THEN render only the active item and hide others."
}

[2026-03-11 16:14] - Updated by Junie
{
    "TYPE": "negative",
    "CATEGORY": "UI stacking bug",
    "EXPECTATION": "Only one rotating headline phrase should be visible at a time without stacking.",
    "NEW INSTRUCTION": "WHEN rendering the animated headline roller THEN show only the active item and hide others."
}

