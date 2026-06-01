import os, glob

ROOT = "falling_datase-1"
splits = ["train", "valid", "test"]
fixed_files = 0
dropped_lines = 0

for sp in splits:
    lbl_dir = os.path.join(ROOT, sp, "labels")
    if not os.path.isdir(lbl_dir): 
        print(f"[{sp}] no labels dir; skipping")
        continue
    for p in glob.glob(os.path.join(lbl_dir, "*.txt")):
        if os.path.getsize(p) == 0:
            # empty file is fine
            continue
        out = []
        changed = False
        with open(p, "r") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) != 5:
                    dropped_lines += 1
                    changed = True
                    continue
                try:
                    # Force class id to 0, keep normalized xywh
                    _, x, y, w, h = parts
                    x, y, w, h = float(x), float(y), float(w), float(h)
                except:
                    dropped_lines += 1
                    changed = True
                    continue
                # sanity check bbox range
                if not (0 <= x <= 1 and 0 <= y <= 1 and 0 < w <= 1 and 0 < h <= 1):
                    dropped_lines += 1
                    changed = True
                    continue
                out.append(f"0 {x} {y} {w} {h}\n")
        if changed:
            with open(p, "w") as f:
                f.writelines(out)
            fixed_files += 1

print(f"[done] fixed_files={fixed_files}, dropped_lines={dropped_lines}")
