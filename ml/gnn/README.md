# GramCredit Social GNN Training

This folder contains a full trainable Graph Neural Network pipeline for GramCredit social trust scoring.

## What this gives you

- GraphSAGE neural model for node-level trust score regression
- Synthetic graph dataset generator for hackathon training
- Export of trained weights into a JSON format consumable by the Next.js app

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r ml/gnn/requirements.txt
```

## Train and export

Download real dataset (SNAP signed trust network):

```bash
mkdir data/real
curl -L "https://snap.stanford.edu/data/soc-sign-bitcoinotc.csv.gz" -o data/real/soc-sign-bitcoinotc.csv.gz
```

Then train on the real data:

```bash
python ml/gnn/train_social_gnn.py \
  --epochs 260 \
  --real-dataset-path data/real/soc-sign-bitcoinotc.csv.gz \
  --num-time-windows 20 \
  --min-time-fraction 0.2 \
  --min-edges-per-graph 3000 \
  --hidden-dim 48 \
  --lr 0.0025 \
  --output-json ml/gnn/gnn-weights.generated.json
```

## Wire trained weights into app

1. Run training command above.
2. Copy generated JSON values into:
   - lib/gramcredit/engines/social-graph/model/gnn-trained-weights.ts
3. Keep GRAMCREDIT_SOCIAL_USE_GNN_MODEL=true in .env.local.

The app will then run neural GraphSAGE forward pass for social trust scoring.
