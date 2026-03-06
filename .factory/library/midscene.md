# Midscene Configuration for Gemini

To use `@midscene/computer` with Gemini models, use the OpenAI-compatible endpoint:

1. Set `MIDSCENE_MODEL_NAME='gemini-3.1-pro-preview'`
2. Set `MIDSCENE_USE_GEMINI='1'`
3. Map `GOOGLE_API_KEY` to `OPENAI_API_KEY`
4. Set `OPENAI_BASE_URL='https://generativelanguage.googleapis.com/v1beta/openai/'`

Example:
```typescript
process.env.MIDSCENE_MODEL_NAME = 'gemini-3.1-pro-preview';
process.env.MIDSCENE_USE_GEMINI = '1';
if (process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.GOOGLE_API_KEY;
  process.env.OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
}
```
