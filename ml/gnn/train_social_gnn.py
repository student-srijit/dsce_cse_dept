# pyright: reportMissingImports=false

import argparse
import csv
import gzip
import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import numpy as np
import torch
import torch.nn.functional as F
from torch import nn
from torch_geometric.data import Data
from torch_geometric.loader import DataLoader
from torch_geometric.nn import SAGEConv


FEATURE_ORDER = [
    "transactionVolumeNorm",
    "transactionFrequencyNorm",
    "onTimeRatio",
    "lateRatio",
    "defaultRatio",
    "repaymentDensity",
    "degreeCentrality",
    "weightedDegreeNorm",
]


@dataclass
class TrainConfig:
    epochs: int = 260
    real_dataset_path: Path = Path("data/real/soc-sign-bitcoinotc.csv.gz")
    num_time_windows: int = 20
    min_time_fraction: float = 0.2
    min_edges_per_graph: int = 3000
    min_label_events: int = 3
    hidden_dim: int = 48
    batch_size: int = 16
    lr: float = 0.0025
    seed: int = 42


class SocialTrustGraphSAGE(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int):
        super().__init__()
        self.conv1 = SAGEConv(input_dim, hidden_dim, aggr="mean")
        self.conv2 = SAGEConv(hidden_dim, hidden_dim, aggr="mean")
        self.head = nn.Linear(hidden_dim, 1)

    def forward(self, data: Data):
        x, edge_index = data.x, data.edge_index
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        out = self.head(x).squeeze(-1)
        return out, x


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def _minmax(values: np.ndarray) -> np.ndarray:
    v_min = float(values.min())
    v_max = float(values.max())
    if abs(v_max - v_min) < 1e-12:
        return np.zeros_like(values, dtype=np.float32)
    return ((values - v_min) / (v_max - v_min)).astype(np.float32)


def load_bitcoin_otc_edges(dataset_path: Path) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    if not dataset_path.exists():
        raise FileNotFoundError(
            f"Real dataset not found at {dataset_path}. Download soc-sign-bitcoinotc.csv.gz first."
        )

    open_fn = gzip.open if dataset_path.suffix == ".gz" else open
    src_list: List[int] = []
    dst_list: List[int] = []
    rating_list: List[float] = []
    ts_list: List[int] = []

    with open_fn(dataset_path, "rt", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 4:
                continue
            try:
                src = int(row[0])
                dst = int(row[1])
                rating = float(row[2])
                timestamp = int(float(row[3]))
            except ValueError:
                continue

            if src == dst:
                continue

            src_list.append(src)
            dst_list.append(dst)
            rating_list.append(rating)
            ts_list.append(timestamp)

    if not src_list:
        raise RuntimeError("Dataset loaded but no valid edges were parsed")

    return (
        np.asarray(src_list, dtype=np.int64),
        np.asarray(dst_list, dtype=np.int64),
        np.asarray(rating_list, dtype=np.float32),
        np.asarray(ts_list, dtype=np.int64),
    )


def build_graph_from_window(
    src_raw: np.ndarray,
    dst_raw: np.ndarray,
    rating_raw: np.ndarray,
    ts_raw: np.ndarray,
    time_threshold: int,
    min_edges_per_graph: int,
    min_label_events: int,
) -> Data | None:
    time_mask = ts_raw <= time_threshold
    if int(time_mask.sum()) < min_edges_per_graph:
        return None

    src_window = src_raw[time_mask]
    dst_window = dst_raw[time_mask]
    rating_window = rating_raw[time_mask]
    ts_window = ts_raw[time_mask]

    node_ids = np.unique(np.concatenate([src_window, dst_window]))
    num_nodes = int(node_ids.shape[0])
    if num_nodes < 100:
        return None

    node_to_idx = {int(node_id): idx for idx, node_id in enumerate(node_ids.tolist())}

    src_idx = np.asarray([node_to_idx[int(v)] for v in src_window], dtype=np.int64)
    dst_idx = np.asarray([node_to_idx[int(v)] for v in dst_window], dtype=np.int64)

    in_count = np.zeros(num_nodes, dtype=np.float32)
    out_count = np.zeros(num_nodes, dtype=np.float32)
    in_rating_sum = np.zeros(num_nodes, dtype=np.float32)
    in_abs_sum = np.zeros(num_nodes, dtype=np.float32)
    out_abs_sum = np.zeros(num_nodes, dtype=np.float32)

    positive_out = np.zeros(num_nodes, dtype=np.float32)
    medium_out = np.zeros(num_nodes, dtype=np.float32)
    negative_out = np.zeros(num_nodes, dtype=np.float32)

    first_seen = np.full(num_nodes, np.iinfo(np.int64).max, dtype=np.int64)
    last_seen = np.zeros(num_nodes, dtype=np.int64)
    neighbor_sets: List[set[int]] = [set() for _ in range(num_nodes)]

    for s, d, r, t in zip(src_idx, dst_idx, rating_window, ts_window):
        out_count[s] += 1
        in_count[d] += 1
        in_rating_sum[d] += r

        abs_r = abs(float(r))
        out_abs_sum[s] += abs_r
        in_abs_sum[d] += abs_r

        if r >= 5:
            positive_out[s] += 1
        elif r <= -5:
            negative_out[s] += 1
        else:
            medium_out[s] += 1

        first_seen[s] = min(first_seen[s], int(t))
        first_seen[d] = min(first_seen[d], int(t))
        last_seen[s] = max(last_seen[s], int(t))
        last_seen[d] = max(last_seen[d], int(t))

        neighbor_sets[s].add(int(d))
        neighbor_sets[d].add(int(s))

    time_span_days = max(1.0, (float(time_threshold) - float(ts_window.min())) / 86400.0)
    active_span_days = np.maximum(1.0, (last_seen - first_seen).astype(np.float32) / 86400.0)

    volume_norm = _minmax(out_abs_sum + in_abs_sum)
    frequency_norm = _minmax(out_count + in_count)
    on_time_ratio = np.divide(
        positive_out,
        np.maximum(1.0, out_count),
        dtype=np.float32,
    )
    late_ratio = np.divide(medium_out, np.maximum(1.0, out_count), dtype=np.float32)
    default_ratio = np.divide(negative_out, np.maximum(1.0, out_count), dtype=np.float32)
    repayment_density = np.clip(
        (out_count + in_count) / (active_span_days + 1e-6),
        0,
        None,
    )
    repayment_density = _minmax(repayment_density)

    degree = np.asarray([len(neighbors) for neighbors in neighbor_sets], dtype=np.float32)
    degree_centrality = degree / max(1.0, float(num_nodes - 1))
    weighted_degree_norm = _minmax(out_abs_sum + in_abs_sum)

    x = np.stack(
        [
            volume_norm,
            frequency_norm,
            on_time_ratio,
            late_ratio,
            default_ratio,
            repayment_density,
            degree_centrality.astype(np.float32),
            weighted_degree_norm,
        ],
        axis=1,
    ).astype(np.float32)

    mean_in_rating = np.divide(
        in_rating_sum,
        np.maximum(1.0, in_count),
        dtype=np.float32,
    )
    y = np.clip((mean_in_rating + 10.0) / 20.0, 0.0, 1.0).astype(np.float32)

    # Only supervise nodes with enough real observations.
    label_mask = (in_count >= float(min_label_events)) & (out_count >= 1)
    if int(label_mask.sum()) < 64:
        return None

    # Undirected message passing by adding reverse edges.
    all_src = np.concatenate([src_idx, dst_idx]).astype(np.int64)
    all_dst = np.concatenate([dst_idx, src_idx]).astype(np.int64)
    all_rating = np.concatenate([rating_window, rating_window]).astype(np.float32)

    edge_index = np.stack([all_src, all_dst], axis=0)
    edge_attr = np.clip((all_rating + 10.0) / 20.0, 0.0, 1.0).astype(np.float32)

    data = Data(
        x=torch.from_numpy(x),
        edge_index=torch.from_numpy(edge_index).long().contiguous(),
        edge_attr=torch.from_numpy(edge_attr),
        y=torch.from_numpy(y),
    )
    data.label_mask = torch.from_numpy(label_mask)
    return data


def build_real_dataset(cfg: TrainConfig) -> List[Data]:
    src_raw, dst_raw, rating_raw, ts_raw = load_bitcoin_otc_edges(cfg.real_dataset_path)

    quantiles = np.linspace(cfg.min_time_fraction, 1.0, cfg.num_time_windows)
    thresholds = sorted({int(np.quantile(ts_raw, q)) for q in quantiles.tolist()})

    graphs: List[Data] = []
    for threshold in thresholds:
        graph = build_graph_from_window(
            src_raw,
            dst_raw,
            rating_raw,
            ts_raw,
            threshold,
            cfg.min_edges_per_graph,
            cfg.min_label_events,
        )
        if graph is not None:
            graphs.append(graph)

    if len(graphs) < 4:
        raise RuntimeError(
            f"Only {len(graphs)} usable real graphs created. Increase data windows or reduce min edges/labels."
        )

    print(
        f"Loaded real dataset from {cfg.real_dataset_path} -> {len(graphs)} time-window graphs for training"
    )
    return graphs


def split_dataset(dataset: List[Data], train_ratio: float = 0.8):
    split_idx = max(1, int(len(dataset) * train_ratio))
    if split_idx >= len(dataset):
        split_idx = len(dataset) - 1
    return dataset[:split_idx], dataset[split_idx:]


def evaluate(model: SocialTrustGraphSAGE, loader: DataLoader, device: torch.device) -> float:
    model.eval()
    total_loss = 0.0
    total_nodes = 0
    with torch.no_grad():
        for batch in loader:
            batch = batch.to(device)
            label_mask = batch.label_mask.bool()
            if int(label_mask.sum().item()) == 0:
                continue
            pred, _ = model(batch)
            loss = F.mse_loss(pred[label_mask], batch.y[label_mask], reduction="sum")
            total_loss += float(loss.item())
            total_nodes += int(label_mask.sum().item())

    return total_loss / max(1, total_nodes)


def train(cfg: TrainConfig, output_json: Path):
    set_seed(cfg.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    dataset = build_real_dataset(cfg)
    random.shuffle(dataset)
    train_data, val_data = split_dataset(dataset)

    train_loader = DataLoader(train_data, batch_size=cfg.batch_size, shuffle=True)
    val_loader = DataLoader(val_data, batch_size=cfg.batch_size, shuffle=False)

    model = SocialTrustGraphSAGE(input_dim=len(FEATURE_ORDER), hidden_dim=cfg.hidden_dim).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=cfg.lr, weight_decay=1e-4)

    best_val = float("inf")
    best_state = None

    for epoch in range(1, cfg.epochs + 1):
        model.train()
        running_loss = 0.0
        running_nodes = 0

        for batch in train_loader:
            batch = batch.to(device)
            label_mask = batch.label_mask.bool()
            if int(label_mask.sum().item()) == 0:
                continue
            optimizer.zero_grad()
            pred, _ = model(batch)
            loss = F.mse_loss(pred[label_mask], batch.y[label_mask])
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            running_loss += float(loss.item()) * int(label_mask.sum().item())
            running_nodes += int(label_mask.sum().item())

        train_mse = running_loss / max(1, running_nodes)
        val_mse = evaluate(model, val_loader, device)

        if val_mse < best_val:
            best_val = val_mse
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

        if epoch % 20 == 0 or epoch == 1 or epoch == cfg.epochs:
            print(f"epoch={epoch:03d} train_mse={train_mse:.5f} val_mse={val_mse:.5f}")

    if best_state is None:
        raise RuntimeError("Training did not produce a checkpoint")

    model.load_state_dict(best_state)
    export_model_weights(model, output_json)
    print(f"Exported trained weights to {output_json}")


def _transpose(weight: torch.Tensor):
    # Convert [out, in] -> [in, out] for TS vector-matrix multiplication.
    return weight.detach().cpu().numpy().T.tolist()


def export_model_weights(model: SocialTrustGraphSAGE, output_json: Path) -> None:
    output_json.parent.mkdir(parents=True, exist_ok=True)

    conv1_l = model.conv1.lin_l.weight
    conv1_r = model.conv1.lin_r.weight
    conv2_l = model.conv2.lin_l.weight
    conv2_r = model.conv2.lin_r.weight

    bias1 = model.conv1.lin_l.bias
    bias2 = model.conv2.lin_l.bias

    readout_weight = model.head.weight.detach().cpu().numpy().reshape(-1).tolist()
    readout_bias = float(model.head.bias.detach().cpu().item())

    payload = {
        "modelVersion": "social_graphsage_v1_exported",
        "inputDim": int(conv1_l.shape[1]),
        "hiddenDim": int(conv1_l.shape[0]),
        "outputDim": 1,
        "featureOrder": FEATURE_ORDER,
        "selfWeight1": _transpose(conv1_l),
        "neighWeight1": _transpose(conv1_r),
        "bias1": bias1.detach().cpu().numpy().tolist(),
        "selfWeight2": _transpose(conv2_l),
        "neighWeight2": _transpose(conv2_r),
        "bias2": bias2.detach().cpu().numpy().tolist(),
        "readoutWeight": readout_weight,
        "readoutBias": readout_bias,
    }

    with output_json.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train GramCredit social trust GraphSAGE model on real signed trust graph data"
    )
    parser.add_argument("--epochs", type=int, default=260)
    parser.add_argument(
        "--real-dataset-path",
        type=Path,
        default=Path("data/real/soc-sign-bitcoinotc.csv.gz"),
        help="Path to real trust graph CSV or CSV.GZ (src,dst,rating,timestamp)",
    )
    parser.add_argument("--num-time-windows", type=int, default=20)
    parser.add_argument("--min-time-fraction", type=float, default=0.2)
    parser.add_argument("--min-edges-per-graph", type=int, default=3000)
    parser.add_argument("--min-label-events", type=int, default=3)
    parser.add_argument("--hidden-dim", type=int, default=48)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=0.0025)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("ml/gnn/gnn-weights.generated.json"),
        help="Where to write exported model weights for TS inference",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cfg = TrainConfig(
        epochs=args.epochs,
        real_dataset_path=args.real_dataset_path,
        num_time_windows=args.num_time_windows,
        min_time_fraction=args.min_time_fraction,
        min_edges_per_graph=args.min_edges_per_graph,
        min_label_events=args.min_label_events,
        hidden_dim=args.hidden_dim,
        batch_size=args.batch_size,
        lr=args.lr,
        seed=args.seed,
    )

    train(cfg, args.output_json)


if __name__ == "__main__":
    main()
