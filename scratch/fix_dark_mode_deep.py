import os
import re

dir_path = "src/components"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = content

    # 1. Inputs and Selects: Adding base dark mode classes
    # We find <select ... className="..."> or <input ... className="...">
    # This regex is a bit complex, so instead we will find className string inside <input and <select
    
    # Simple replace for common input/select styling (assuming they contain specific border/bg strings)
    # Most inputs have: bg-white border border-gray-300
    new_content = re.sub(r'bg-white(\s+dark:bg-[a-zA-Z0-9_-]+(/[0-9]+)?)?\s+border\s+border-gray-300(\s+dark:border-[a-zA-Z0-9_-]+)?', 
                         'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-600', 
                         new_content)
                         
    new_content = re.sub(r'border-gray-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100',
                         'border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-600',
                         new_content)
                         
    new_content = re.sub(r'bg-white dark:bg-slate-900 placeholder-gray-500 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100',
                         'bg-white dark:bg-slate-800 dark:border-slate-700 placeholder-gray-500 dark:placeholder-slate-400 text-gray-900 dark:text-slate-100 dark:focus:ring-slate-600',
                         new_content)

    # 2. Semantic colors (Alerts and Badges)
    # Red solid
    new_content = re.sub(r'bg-red-500 text-white(\s+dark:text-slate-100)?', 'bg-red-500 text-white dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 border border-transparent', new_content)
    new_content = re.sub(r'bg-red-600 text-white(\s+dark:text-slate-100)?', 'bg-red-600 text-white dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 border border-transparent', new_content)
    
    # Red light (badges)
    new_content = re.sub(r'bg-red-100 text-red-700', 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800', new_content)
    new_content = re.sub(r'bg-red-100 text-red-800', 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 dark:border dark:border-red-800', new_content)
    
    # Green solid
    new_content = re.sub(r'bg-green-500 text-white(\s+dark:text-slate-100)?', 'bg-green-500 text-white dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 border border-transparent', new_content)
    new_content = re.sub(r'bg-green-600 text-white(\s+dark:text-slate-100)?', 'bg-green-600 text-white dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 border border-transparent', new_content)
    
    # Green light
    new_content = re.sub(r'bg-green-100 text-green-700', 'bg-green-100 text-green-700 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border dark:border-emerald-800', new_content)
    new_content = re.sub(r'bg-green-100 text-green-800', 'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border dark:border-emerald-800', new_content)
    
    # Orange solid
    new_content = re.sub(r'bg-orange-500 text-white(\s+dark:text-slate-100)?', 'bg-orange-500 text-white dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800 border border-transparent', new_content)
    new_content = re.sub(r'bg-orange-600 text-white(\s+dark:text-slate-100)?', 'bg-orange-600 text-white dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800 border border-transparent', new_content)
    
    # Orange light
    new_content = re.sub(r'bg-orange-100 text-orange-700', 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 dark:border dark:border-orange-800', new_content)
    new_content = re.sub(r'bg-orange-100 text-orange-800', 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 dark:border dark:border-orange-800', new_content)

    # Amber light
    new_content = re.sub(r'bg-amber-100 text-amber-700', 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 dark:border dark:border-amber-800', new_content)
    new_content = re.sub(r'bg-amber-100 text-amber-800', 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 dark:border dark:border-amber-800', new_content)

    # Indigo light
    new_content = re.sub(r'bg-indigo-100 text-indigo-700', 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border dark:border-indigo-800', new_content)
    new_content = re.sub(r'bg-indigo-100 text-indigo-800', 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border dark:border-indigo-800', new_content)

    # 3. Typography in Tables
    # Some td, p, span elements have text-gray-900 or text-gray-800 but they aren't properly inverted.
    # The user noted invisible typography in ConsolidacaoView and AnalisesView. 
    # The easiest blanket fix is to ensure all `text-gray-900` or `800` inside `className` attributes that are missing `dark:` get `dark:text-slate-200`.
    # Wait, my previous script added `dark:text-slate-100`. Let's replace `dark:text-slate-100` with `dark:text-slate-200` where it matters, 
    # or just enforce `dark:text-slate-200` on any `text-gray-900` or `text-gray-800` that is inside a table, or generally inside Consolidacao and Analises.
    
    # For now, let's just globally ensure `text-gray-900` and `text-gray-800` have `dark:text-slate-200` (softer and more readable than 100 on dark bg)
    new_content = re.sub(r'text-gray-900(?! dark:)', 'text-gray-900 dark:text-slate-200', new_content)
    new_content = re.sub(r'text-gray-800(?! dark:)', 'text-gray-800 dark:text-slate-200', new_content)
    new_content = re.sub(r'text-gray-900 dark:text-slate-100', 'text-gray-900 dark:text-slate-200', new_content)
    new_content = re.sub(r'text-gray-800 dark:text-slate-100', 'text-gray-800 dark:text-slate-200', new_content)
    
    # Same for gray-700 inside tables
    new_content = re.sub(r'text-gray-700 dark:text-slate-300', 'text-gray-700 dark:text-slate-300', new_content) # Keep this or make it 200? Let's leave as 300, it's readable.
    
    # If the file is ConsolidacaoView or AnalisesView, we can be more aggressive for table cells:
    if "ConsolidacaoView.tsx" in filepath or "AnalisesView.tsx" in filepath:
        # Some classes in td might not even have text-gray-* explicitly set, inheriting from body.
        # But wait, Tailwind doesn't inherit text color if it's not set, it inherits the body text color.
        # If the body is dark:text-slate-200 (which isn't set globally), we should set it.
        # We can add a catch-all in the component's main div or just ensure `td` tags have it.
        pass

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
