import os
import re

dir_path = "src/components"

dark_classes = "dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-600"
dark_classes_set = set(dark_classes.split())

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    def replace_class(match):
        prefix = match.group(1) # <input or <select with any attributes up to className="
        class_str = match.group(2)
        suffix = match.group(3)
        
        # Don't modify if it's a checkbox or radio? They don't typically need bg-slate-800, but they can have it.
        # Actually it's fine for text inputs and selects.
        
        # Add the classes if not present
        classes = set(class_str.split())
        for c in dark_classes_set:
            if c not in classes:
                class_str += f" {c}"
                
        # also clean up any duplicate or conflicting dark classes if needed, 
        # but just appending is fine. Tailwind will handle the rest.
        return f'{prefix}className="{class_str}"{suffix}'
        
    # Regex to match <select ... className="..."> or <input ... className="...">
    # This might match across newlines, so we use re.DOTALL cautiously or handle it.
    
    # Let's use a simpler approach: just find className="([^"]*)" inside <select ...> and <input ...>
    # Since React components can have multiline props, we use a regex that matches <select ... >
    
    # 1. Update <select> and <input>
    new_content = content
    
    tags_to_update = ['select', 'input']
    for tag in tags_to_update:
        # find all <tag ... >
        pattern = re.compile(rf'(<{tag}\b[^>]*className=["\'])([^"\']+)(["\'][^>]*>)', re.DOTALL | re.IGNORECASE)
        new_content = pattern.sub(replace_class, new_content)
        
    # Also fix some specific bg-white classes that didn't get caught
    # Find all bg-white dark:bg-slate-900 or bg-white without dark in cards
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
