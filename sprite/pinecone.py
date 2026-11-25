#!/usr/bin/env python3
"""Sprite-side Pinecone helper for Proof or It Didn't Happen.

Runs INSIDE the Sprite: the Sprites gateway attaches the stored Pinecone
key by Sprite identity, so no credentials live here or in the repo.

  store  --id <claim-id> --text-b64 <b64> --result proven|owed --snippet-b64 <b64>
         Embeds the claim text (passage), upserts vector claim-<id> with
         metadata {claim, result, text, snippet}; prints {"stored": id}.
  recall --text-b64 <b64>
         Embeds the claim text (passage — the same input_type as store, so
         the same text scores ~1.0; a query-type embed of the same text
         scores only ~0.86 and would miss), queries topK 1; prints
         {"match": {id, result, score, text} | null}. A match counts only
         when score >= 0.9 (the same text scores ~1.0).
"""
import argparse
import base64
import json
import sys
import urllib.error
import urllib.request

BASE = "https://api.sprites.dev/v1/gateway/pinecone/-DUWCdlfSnCjOKiXO8xJrQ"
INDEX = "proof-claims"
MODEL = "llama-text-embed-v2"


def call(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:600], file=sys.stderr)
        raise


def embed(text, input_type):
    resp = call("POST", "/embed", {
        "model": MODEL,
        "inputs": [{"text": text}],
        "parameters": {"input_type": input_type, "truncate": "END"},
    })
    return resp["data"][0]["values"]


def do_store(args):
    text = base64.b64decode(args.text_b64).decode()
    snippet = base64.b64decode(args.snippet_b64).decode()
    vec = embed(text, "passage")
    up = call("POST", f"/indexes/{INDEX}/vectors/upsert", {
        "vectors": [{"id": f"claim-{args.id}", "values": vec,
                     "metadata": {"claim": args.id, "result": args.result,
                                  "text": text, "snippet": snippet}}],
    })
    print(json.dumps({"stored": f"claim-{args.id}",
                      "upsertedCount": up.get("upsertedCount", 0)}))


def do_recall(args):
    text = base64.b64decode(args.text_b64).decode()
    vec = embed(text, "passage")
    queried = call("POST", f"/indexes/{INDEX}/query", {
        "vector": vec, "topK": 1, "includeMetadata": True,
    })
    matches = queried.get("matches", [])
    if matches and matches[0].get("score", 0) >= 0.9:
        m = matches[0]
        md = m.get("metadata", {})
        print(json.dumps({"match": {"id": m["id"], "result": md.get("result"),
                                    "score": m["score"],
                                    "text": md.get("text", "")}}))
    else:
        print(json.dumps({"match": None}))


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    store = sub.add_parser("store")
    store.add_argument("--id", required=True)
    store.add_argument("--text-b64", required=True)
    store.add_argument("--result", choices=["proven", "owed"], required=True)
    store.add_argument("--snippet-b64", required=True)
    recall = sub.add_parser("recall")
    recall.add_argument("--text-b64", required=True)
    args = parser.parse_args()
    if args.command == "store":
        do_store(args)
    else:
        do_recall(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
