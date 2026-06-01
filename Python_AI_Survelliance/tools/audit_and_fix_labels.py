import os, glob, yaml

ROOT = "falling_datase-1"
DATA_YAML = os.path.join(ROOT, "data.yaml")

def load_yaml(p):
    with open(p, "r") as f: return yaml.safe_load(f)

def fix_split(split, nc, single_class):
    lbl_dir = os.path.join(ROOT, split, "labels")
    if not os.path.isdir(lbl_dir):
        print(f"[{split}] no labels dir, skip")
        return
    files = sorted(glob.glob(os.path.join(lbl_dir, "*.txt")))
    bad_ids = 0
    total_boxes = 0
    changed_files = 0

    for lp in files:
        changed = False
        out = []
        if not os.path.getsize(lp):
            # empty file is fine; keep it
            continue
        with open(lp, "r") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) != 5:
                    # malformed, drop
                    changed = True
                    continue
                try:
                    cid = int(float(parts[0]))
                    x, y, w, h = map(float, parts[1:])
                except:
                    changed = True
                    continue

                # bbox sanity
                if not (0 <= x <= 1 and 0 <= y <= 1 and 0 < w <= 1 and 0 < h <= 1):
                    changed = True
                    continue

                # enforce taxonomy
                if single_class:
                    cid_new = 0
                else:
                    cid_new = cid

                if cid_new < 0 or cid_new >= nc:
                    bad_ids += 1
                    changed = True
                    continue

                out.append(f"{cid_new} {x} {y} {w} {h}\n")
                total_boxes += 1

        if changed:
            with open(lp, "w") as f:
                f.writelines(out)
            changed_files += 1

    print(f"[{split}] files: {len(files)}, boxes kept: {total_boxes}, fixed files: {changed_files}, dropped out-of-range boxes: {bad_ids}")

def main():
    data = load_yaml(DATA_YAML)
    names = data.get("names")
    if isinstance(names, dict):
        names = [names[k] for k in sorted(names.keys(), key=lambda x: int(x))]
    nc = int(data.get("nc", len(names)))
    single_class = (nc == 1)

    print(f"[config] nc={nc}, single_class={single_class}")
    for sp in ("train", "valid", "test"):
        fix_split(sp, nc, single_class)

if __name__ == "__main__":
    main()
