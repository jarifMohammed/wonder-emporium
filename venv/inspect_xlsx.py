import openpyxl
import json

wb = openpyxl.load_workbook('lulu-print-api-spec-sheet.xlsx')
sheet = wb['Full Spec Sheet']

rows = list(sheet.iter_rows(values_only=True))
header = rows[0]

# Find indexes
indexes = {h: idx for idx, h in enumerate(header)}

idx_book_type = indexes.get('Book Type')
idx_trim_w = indexes.get('Trim Width (in)')
idx_trim_h = indexes.get('Trim Height (in)')
idx_color = indexes.get('Interior Color')
idx_bind = indexes.get('Bind')
idx_paper = indexes.get('Paper Type')
idx_lamination = indexes.get('Lamination')

mapping = {}

for row in rows[1:]:
    if not any(row):
        continue
    book_type = row[idx_book_type]
    w = row[idx_trim_w]
    h = row[idx_trim_h]
    color = row[idx_color]
    bind = row[idx_bind]
    paper = row[idx_paper]
    lamination = row[idx_lamination]

    if not book_type or not bind:
        continue

    # Format trim size string like "6x9" or "8.5x11" or "5.5x8.5"
    w_str = str(int(w)) if w == int(w) else str(w)
    h_str = str(int(h)) if h == int(h) else str(h)
    trim_size = f"{w_str}x{h_str}"

    if trim_size not in mapping:
        mapping[trim_size] = {
            'bookType': book_type,
            'trimSize': trim_size,
            'binds': set(),
            'colors': set(),
            'papers': set(),
            'laminations': set()
        }
    
    if bind:
        mapping[trim_size]['binds'].add(bind)
    if color:
        mapping[trim_size]['colors'].add(color)
    if paper:
        mapping[trim_size]['papers'].add(paper)
    if lamination:
        mapping[trim_size]['laminations'].add(lamination)

# Convert sets to sorted lists for JSON serialization, filtering None
json_mapping = {}
for trim, info in mapping.items():
    json_mapping[trim] = {
        'bookType': info['bookType'],
        'trimSize': info['trimSize'],
        'binds': sorted(list(x for x in info['binds'] if x is not None)),
        'colors': sorted(list(x for x in info['colors'] if x is not None)),
        'papers': sorted(list(x for x in info['papers'] if x is not None)),
        'laminations': sorted(list(x for x in info['laminations'] if x is not None))
    }

print(json.dumps(json_mapping, indent=2))

wb.close()
