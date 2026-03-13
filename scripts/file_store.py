#!/usr/bin/env python3
"""
Gemini File Search store management CLI.

Usage:
  python scripts/file_store.py list
  python scripts/file_store.py docs [STORE_ID]
  python scripts/file_store.py upload STORE_ID FILE [FILE ...]
  python scripts/file_store.py remove STORE_ID DOC_NAME [DOC_NAME ...]
  python scripts/file_store.py create DISPLAY_NAME
  python scripts/file_store.py delete STORE_ID
  python scripts/file_store.py rebuild

Run with: uv run python scripts/file_store.py <command>
"""

from __future__ import annotations

import argparse
import os
import time

from google import genai

API_KEY = "AIzaSyByiOc5mdAKygGhccMJTkix1Z4I68gLuM8"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_STORE = "fileSearchStores/voidpilotdocscontext-cs0t6mbqauxc"
DEFAULT_DISPLAY_NAME = "voidpilot-docs-context"


def _client() -> genai.Client:
    return genai.Client(api_key=API_KEY)


def _resolve_store(store_id: str | None) -> str:
    return store_id if store_id else DEFAULT_STORE


def _upload_files(
    client: genai.Client, store_name: str, filepaths: list[str]
) -> tuple[int, int]:
    """Upload a list of files into a store. Returns (success, failed) counts."""
    success, failed = 0, 0
    for filepath in filepaths:
        rel = os.path.relpath(filepath, BASE_DIR)
        print(f"  {rel} ...", end=" ", flush=True)
        try:
            uploaded = client.files.upload(
                file=filepath,
                config={"display_name": rel, "mime_type": "text/markdown"},
            )
            op = client.file_search_stores.import_file(
                file_search_store_name=store_name,
                file_name=uploaded.name,
            )
            while not op.done:
                time.sleep(1)
                op = client.operations.get(op)
            print("OK")
            success += 1
        except Exception as e:
            print(f"FAIL ({e})")
            failed += 1
    return success, failed


def _gather_doc_files() -> list[str]:
    """Collect all .md files from /docs + root README.md and AGENTS.md."""
    files: list[str] = []
    docs_dir = os.path.join(BASE_DIR, "docs")
    for root, dirs, filenames in os.walk(docs_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for f in sorted(filenames):
            if f.endswith(".md"):
                files.append(os.path.join(root, f))
    for name in ("README.md", "AGENTS.md"):
        path = os.path.join(BASE_DIR, name)
        if os.path.exists(path):
            files.append(path)
    return files


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_list(_args: argparse.Namespace) -> None:
    """List all file search stores."""
    client = _client()
    stores = list(client.file_search_stores.list())
    if not stores:
        print("No stores found.")
        return
    for s in stores:
        print(f"  {s.name}  (display_name={s.display_name})")


def cmd_docs(args: argparse.Namespace) -> None:
    """List documents in a store."""
    client = _client()
    store = _resolve_store(args.store_id)
    docs = list(client.file_search_stores.documents.list(parent=store))
    if not docs:
        print(f"No documents in {store}")
        return
    print(f"Documents in {store}:")
    for d in docs:
        print(f"  {d.name}  (display_name={d.display_name})")


def cmd_upload(args: argparse.Namespace) -> None:
    """Upload files to a store."""
    client = _client()
    store = _resolve_store(args.store_id)
    abs_files = [os.path.abspath(f) for f in args.files]
    success, failed = _upload_files(client, store, abs_files)
    print(f"\nUploaded {success}, failed {failed}")


def cmd_remove(args: argparse.Namespace) -> None:
    """Remove documents from a store by name (with force to also delete chunks)."""
    client = _client()
    for doc_name in args.doc_names:
        print(f"  Deleting {doc_name} ...", end=" ", flush=True)
        try:
            client.file_search_stores.documents.delete(
                name=doc_name, config={"force": True}
            )
            print("OK")
        except Exception as e:
            print(f"FAIL ({e})")


def cmd_create(args: argparse.Namespace) -> None:
    """Create a new file search store."""
    client = _client()
    store = client.file_search_stores.create(
        config={"display_name": args.display_name}
    )
    print(f"Created: {store.name}")


def cmd_delete(args: argparse.Namespace) -> None:
    """Delete a file search store and all its documents/chunks."""
    client = _client()
    store = _resolve_store(args.store_id)
    print(f"  Deleting {store} ...", end=" ", flush=True)
    try:
        client.file_search_stores.delete(name=store, config={"force": True})
        print("OK")
    except Exception as e:
        print(f"FAIL ({e})")


def cmd_rebuild(_args: argparse.Namespace) -> None:
    """Delete current store, create a fresh one, upload all /docs + root markdowns."""
    client = _client()

    print(f"Deleting {DEFAULT_STORE} ...")
    try:
        client.file_search_stores.delete(name=DEFAULT_STORE, config={"force": True})
        print("  Deleted")
    except Exception as e:
        print(f"  Skip ({e})")

    store = client.file_search_stores.create(
        config={"display_name": DEFAULT_DISPLAY_NAME}
    )
    print(f"Created: {store.name}\n")

    files_to_upload = _gather_doc_files()
    print(f"Uploading {len(files_to_upload)} files ...")
    success, failed = _upload_files(client, store.name, files_to_upload)

    print(f"\nDone: {success} uploaded, {failed} failed")
    print(f"Store ID: {store.name}")
    if store.name != DEFAULT_STORE:
        print(f"\nUpdate config.py DEFAULT_STORE to: {store.name}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gemini File Search store management"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List all stores")

    p_docs = sub.add_parser("docs", help="List documents in a store")
    p_docs.add_argument("store_id", nargs="?", default=None)

    p_upload = sub.add_parser("upload", help="Upload files to a store")
    p_upload.add_argument("store_id")
    p_upload.add_argument("files", nargs="+")

    p_remove = sub.add_parser("remove", help="Remove documents by full name")
    p_remove.add_argument("doc_names", nargs="+")

    p_create = sub.add_parser("create", help="Create a new store")
    p_create.add_argument("display_name")

    p_delete = sub.add_parser("delete", help="Delete a store")
    p_delete.add_argument("store_id", nargs="?", default=None)

    sub.add_parser("rebuild", help="Nuke + rebuild from /docs + root markdowns")

    args = parser.parse_args()
    handler = {
        "list": cmd_list,
        "docs": cmd_docs,
        "upload": cmd_upload,
        "remove": cmd_remove,
        "create": cmd_create,
        "delete": cmd_delete,
        "rebuild": cmd_rebuild,
    }[args.command]
    handler(args)


if __name__ == "__main__":
    main()
