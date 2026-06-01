import os, yaml, glob

ROOT = "falling_datase-1"          # dataset root
DATA_YAML = os.path.join(ROOT, "data.yaml")

# Map original class names (lowercased) -> new ids
# We’ll collapse fall-like classes to 'fall' and optionally map stand-like to 'stand'.
NAME_TO_NEWID = {
    "fall": 0, "falling": 0, "fallen": 0, "fall-person": 0, "fall_person": 0, "fall person": 0,
    "stand": 1, "standing": 1
}
DROP_NAMES = {"helmet"}  # drop irrelevant classes

def load_yaml(p):
    with open(p, "r") as f: return yaml.safe_load(f)

def save_yaml(p, obj):
    with open(p, "w") as f: yaml.safe_dump(obj, f, sort_keys=False)

def main():
    data = load_yaml(DATA_YAML)
    # original names if present (used to resolve old ids)
    orig_names = [str(n) for n in data.get("names", [])]
    name_by_id = {i: n.lower() for i, n in enumerate(orig_names)} if orig_names else {}

    # ensure nc matches names
    data["nc"] = len(data["names"])
    save_yaml(DATA_YAML, data)
    single_class = (len(data["names"]) == 1)  # True if you picked only 'fall'
    print("[OK] data.yaml:", data)

    def process_split(split):
        label_dir = os.path.join(ROOT, split, "labels")
        if not os.path.isdir(label_dir): return
        files = sorted(glob.glob(os.path.join(label_dir, "*.txt")))
        kept, dropped = 0, 0
        for lp in files:
            out = []
            with open(lp, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) != 5:
                        dropped += 1
                        continue
                    try:
                        old_id = int(float(parts[0]))
                        x, y, w, h = map(float, parts[1:])
                    except:
                        dropped += 1
                        continue

                    # bbox sanity
                    if not (0 <= x <= 1 and 0 <= y <= 1 and 0 < w <= 1 and 0 < h <= 1):
                        dropped += 1
                        continue

                    # resolve old name if possible
                    if name_by_id and 0 <= old_id < len(name_by_id):
                        old_name = name_by_id[old_id]
                    else:
                        # if we can't resolve by id->name, attempt heuristics by id (treat unknown as fall)
                        old_name = "fall"

                    if old_name in DROP_NAMES:
                        dropped += 1
                        continue

                    # map to new ids
                    if single_class:
                        new_id = 0
                    else:
                        if old_name in NAME_TO_NEWID:
                            new_id = NAME_TO_NEWID[old_name]
                        elif "fall" in old_name:
                            new_id = 0
                        elif "stand" in old_name:
                            new_id = 1
                        else:
                            dropped += 1
                            continue

                    out.append(f"{new_id} {x} {y} {w} {h}\n")

            with open(lp, "w") as f:
                f.writelines(out)
            kept += 1

        print(f"[{split}] cleaned {kept} files, dropped {dropped} boxes")

    for sp in ("train", "valid", "test"):
        process_split(sp)

if __name__ == "__main__":
    main()
