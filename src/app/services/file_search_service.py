"""File search service for project context retrieval."""

import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


def search_project_context(
    query: str,
    api_key: str,
    file_search_store_name: str,
) -> str:
    """
    Search project context using Gemini 3 Flash with File Search.

    This is a blocking call - the model waits for results before responding.
    """
    client = genai.Client(api_key=api_key, http_options={"api_version": "v1beta"})

    logger.info("Searching project context for: %s", query)

    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=query,
        config=types.GenerateContentConfig(
            tools=[types.Tool(
                file_search=types.FileSearch(
                    file_search_store_names=[file_search_store_name]
                )
            )]
        )
    )

    result = response.text
    if result is None:
        logger.warning("Search returned no results")
        return "No results found."
    logger.info("Search result length: %d chars", len(result))
    return result
