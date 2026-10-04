import os
import re

dir_path = "src/components"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    # Replace starting className="className=" with className="
    content = content.replace('className="className="', 'className="')
    
    # In those same replacements, the end of the string has double quotes like `"" value=` or `"" />` or `"" onChange=`
    # We can just replace any occurrences of `"" ` (double quote space) with `" ` where it makes sense, 
    # but more safely we can just use regex to fix double quotes that follow our specific dark classes
    content = re.sub(r'dark:bg-slate-800""', r'dark:bg-slate-800"', content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
